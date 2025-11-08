import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import {
  CacheKeys,
  CacheTags,
  CacheConfig,
  rememberWithMetrics,
  CacheInvalidation,
} from "@/lib/cache";
import { verifyCaseConsistency } from "@/lib/caseLinks";
import { ComplaintFlow } from "@/lib/complaintStatus";
import { env } from "@/lib/env";
import { AppError, ErrorCode, errorResponse, handleApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { buildComplaintQuery } from "@/lib/queryBuilder";
import {
  complaintCreateSchema,
  complaintQuerySchema,
  complaintUpdateSchema,
} from "@/lib/schemas/complaints";
import { normalizePhone } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    // Allow both public submissions and HUMAS staff
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
    const role = token?.role;
    const isHumas = role === "humas";
    const isPublic = !token; // No token means public submission

    // Parse and validate the request body
    const raw = await req.json();
    const data = complaintCreateSchema.parse(raw);

    // Use centralized phone normalization function
    const normalizedPhone = normalizePhone(data.phone);

    const created = await prisma.$transaction(async (tx) => {
      const comp = await tx.complaint.create({
        data: {
          customerName: data.customerName,
          address: data.address,
          mapsLink: data.mapsLink,
          connectionNumber: data.connectionNumber,
          phone: normalizedPhone,
          complaintText: data.complaintText,
          category: data.category,
          processedAt: data.processedAt ? new Date(data.processedAt) : undefined,
        },
        select: { id: true },
      });
      // Write initial status history (REPORTED)
      await ComplaintFlow.markReported(tx, comp.id, {
        actorRole: isPublic ? "public" : "humas",
        actorId: isPublic ? null : (token?.sub ?? null),
        note: isPublic ? "Pengaduan dari publik" : "Pengaduan dibuat",
      });
      return comp;
    });

    // ✅ PERFORMANCE: Invalidate relevant caches after creating a complaint
    CacheInvalidation.complaints();

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return errorResponse(AppError.validation(e.flatten?.() ?? undefined));
    }
    return handleApiError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    // Require an authenticated session/token; don't rely solely on middleware
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
    if (!token) return errorResponse(AppError.unauthorized());

    const { searchParams } = new URL(req.url);
    const query = complaintQuerySchema.parse({
      q: searchParams.get("q") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
    });

    const fromDate = query.from ? new Date(query.from) : undefined;
    const toDate = query.to ? new Date(query.to) : undefined;

    // ✅ PERFORMANCE: Use optimized query builder
    const queryOptions = buildComplaintQuery(
      {
        dateRange: { from: fromDate, to: toDate },
        searchTerm: query.q,
      },
      {
        includeLevel: "basic",
        page: query.page,
        pageSize: query.pageSize,
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    );

    // ✅ PERFORMANCE: Create cache keys for count and items
    const filters = {
      dateRange: { from: fromDate, to: toDate },
      searchTerm: query.q,
    };
    const countCacheKey = CacheKeys.complaint.count(filters);
    const listCacheKey = CacheKeys.complaint.list({
      ...filters,
      page: query.page,
      pageSize: query.pageSize,
    });

    // ✅ PERFORMANCE: Use caching for better performance - parallel execution
    const [total, items] = await Promise.all([
      rememberWithMetrics(
        countCacheKey,
        () => prisma.complaint.count({ where: queryOptions.where }),
        CacheConfig.COUNT_TTL,
        [CacheTags.COMPLAINTS, CacheTags.STATISTICS],
      ),
      rememberWithMetrics(
        listCacheKey,
        () => prisma.complaint.findMany(queryOptions),
        CacheConfig.LIST_TTL,
        [CacheTags.COMPLAINTS],
      ),
    ]);

    return NextResponse.json({
      total,
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
    const role = token?.role;
    if (!(role === "humas" || role === "distribusi")) {
      return errorResponse(AppError.forbidden(role ?? null, ["humas", "distribusi"]));
    }
    const { searchParams } = new URL(req.url);
    const idFromQuery = searchParams.get("id") || undefined;
    const raw = await req.json().catch(() => ({}));
    const parsed = complaintUpdateSchema.parse({ ...raw, id: raw?.id ?? idFromQuery });

    if (!parsed.id) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, "Parameter 'id' wajib.", {
        status: 400,
        details: { fieldErrors: { id: ["id wajib"] } },
      });
    }

    // Disallow manual mutation of linkage fields from this endpoint to avoid inconsistencies.
    if (
      Object.prototype.hasOwnProperty.call(parsed, "serviceRequestId") ||
      Object.prototype.hasOwnProperty.call(parsed, "workOrderId") ||
      Object.prototype.hasOwnProperty.call(parsed, "repairReportId")
    ) {
      return errorResponse(
        ErrorCode.VALIDATION_ERROR,
        "Tidak bisa mengubah linkage (PSP/SPK/BAP) langsung dari endpoint ini. Gunakan endpoint pembuatan PSP/SPK/BAP agar konsisten.",
        { status: 400 },
      );
    }

    const updateData: any = {};
    if ("processedAt" in parsed) {
      updateData.processedAt =
        parsed.processedAt === null ? null : new Date(parsed.processedAt as string);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.complaint.update({
        where: { id: parsed.id! },
        data: updateData,
        select: {
          id: true,
          processedAt: true,
          serviceRequestId: true,
          workOrderId: true,
          repairReportId: true,
        },
      });
      // Optional: verify consistency after update (no fix here; just report if inconsistent)
      await verifyCaseConsistency(tx, next.id, { fix: false });
      return next;
    });

    // ✅ PERFORMANCE: Invalidate relevant caches after updating a complaint
    CacheInvalidation.complaints();

    return NextResponse.json(updated);
  } catch (e) {
    if ((e as any)?.name === "ZodError") {
      return errorResponse(AppError.validation((e as any).flatten?.() ?? undefined));
    }
    return handleApiError(e);
  }
}
