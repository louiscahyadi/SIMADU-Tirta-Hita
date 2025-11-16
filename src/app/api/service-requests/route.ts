import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { assertCanCreateSR, verifyCaseConsistency } from "@/lib/caseLinks";
import { ComplaintFlow } from "@/lib/complaintStatus";
import { env } from "@/lib/env";
import { BUSINESS_ERRORS } from "@/lib/errorMessages";
import { AppError, ErrorCode, errorResponse, handleApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { serviceRequestSchema } from "@/lib/schemas/serviceRequest";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  const role = token?.role;
  if (role !== "humas") return errorResponse(AppError.forbidden(role ?? null, "humas"));

  const raw = await req.json();
  const data = serviceRequestSchema.parse(raw);

  const created = await prisma.$transaction(async (tx) => {
    if (data.caseId) {
      await assertCanCreateSR(tx, data.caseId);
    }
    const sr = await tx.serviceRequest.create({
      data: {
        // kompatibilitas tampilan lama
        customerName: data.reporterName,
        address: data.address,
        serviceNumber: data.serviceNumber ?? null,
        phone: data.reporterPhone,

        // PSP fields
        reporterName: data.reporterName,
        reporterPhone: data.reporterPhone,
        description: data.description ?? null,
        receivedAt: data.receivedAt ?? null,
        receivedBy: data.receivedBy ?? null,
        reasons: data.reasons ? data.reasons : undefined,
        otherReason: data.otherReason ?? null,
        serviceCostBy: data.serviceCostBy ?? null,
        urgency: data.urgency,
        requestDate: data.requestDate,
        notes: data.notes ?? null,
      },
    });

    if (data.caseId) {
      // Link complaint to SR and update status/history via helper
      await ComplaintFlow.markPSPCreated(tx, data.caseId, sr.id, {
        actorRole: "humas",
        actorId: token?.sub ?? null,
        note: null,
      });
      // Ensure complaint link fields match the SR→WO→RR chain
      await verifyCaseConsistency(tx, data.caseId, { fix: true });
    }

    return sr;
  });

  return NextResponse.json(created);
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  const role = token?.role;
  if (role !== "humas") return errorResponse(AppError.forbidden(role ?? null, "humas"));

  try {
    const raw = await req.json();
    const url = new URL(req.url);
    const id = (raw?.id as string | undefined) ?? (url.searchParams.get("id") || undefined);
    if (!id)
      return errorResponse(ErrorCode.VALIDATION_ERROR, "Parameter 'id' wajib.", {
        status: 400,
        details: { fieldErrors: { id: ["id wajib"] } },
      });

    // Allow partial updates of PSP fields only if SPK belum dibuat
    const { z } = await import("zod");
    const updateSchema = z
      .object({
        id: z.string().min(1),
        serviceNumber: z.string().trim().max(50).optional(),
        reporterName: z.string().trim().min(2).max(100).optional(),
        reporterPhone: z
          .string()
          .trim()
          .min(8)
          .max(20)
          .regex(/^[+\d ]+$/)
          .optional(),
        address: z.string().trim().min(5).max(200).optional(),
        receivedAt: z.coerce.date().optional(),
        receivedBy: z.string().trim().min(2).max(100).optional(),
        reasons: z.array(z.string().trim()).optional(),
        otherReason: z.string().trim().max(200).optional(),
        serviceCostBy: z.enum(["PERUMDA AM", "Langganan"]).optional(),
        description: z.string().trim().max(2000).optional(),
        urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
        requestDate: z.coerce.date().optional(),
        notes: z.string().trim().max(2000).optional(),
      })
      .strict();

    const data = updateSchema.parse({ ...raw, id });

    const updated = await prisma.$transaction(async (tx) => {
      const sr = await tx.serviceRequest.findUnique({
        where: { id: data.id },
        include: { workOrder: true },
      });
      if (!sr) throw new Error(BUSINESS_ERRORS.DATA_NOT_FOUND);
      if (sr.workOrder) throw new Error("PSP tidak bisa diubah setelah SPK dibuat");

      const next = await tx.serviceRequest.update({
        where: { id: data.id },
        data: {
          serviceNumber: data.serviceNumber ?? undefined,
          reporterName: data.reporterName ?? undefined,
          reporterPhone: data.reporterPhone ?? undefined,
          address: data.address ?? undefined,
          receivedAt: data.receivedAt ?? undefined,
          receivedBy: data.receivedBy ?? undefined,
          reasons: data.reasons ?? undefined,
          otherReason: data.otherReason ?? undefined,
          serviceCostBy: data.serviceCostBy ?? undefined,
          description: data.description ?? undefined,
          urgency: data.urgency ?? undefined,
          requestDate: data.requestDate ?? undefined,
          notes: data.notes === undefined ? undefined : data.notes || null,
        },
      });
      return next;
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return errorResponse(AppError.validation(e.flatten?.() ?? undefined));
    }
    return handleApiError(e);
  }
}

export async function GET(req: NextRequest) {
  // Ensure request is authenticated
  try {
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
    if (!token) return errorResponse(AppError.unauthorized());

    // Allow both humas and distribusi roles to access this endpoint
    const role = token?.role;
    if (role !== "humas" && role !== "distribusi") {
      return errorResponse(AppError.forbidden(role ?? null, ["humas", "distribusi"]));
    }
    const url = new URL(req.url);
    // Support fetching single item by id for prefilling SPK fields
    const byId = url.searchParams.get("id");
    if (byId) {
      const sr = await prisma.serviceRequest.findUnique({ where: { id: byId } });
      if (!sr) {
        return errorResponse(AppError.notFound(BUSINESS_ERRORS.DATA_NOT_FOUND));
      }
      // related complaint to prefill SPK
      const comp = await prisma.complaint.findFirst({
        where: { serviceRequestId: byId },
        select: { id: true, category: true, customerName: true, address: true },
      });
      return NextResponse.json({
        ...sr,
        _complaintCategory: comp?.category ?? null,
        _complaintId: comp?.id ?? null,
        _complaintCustomerName: comp?.customerName ?? null,
        _complaintAddress: comp?.address ?? null,
      });
    }
    const hasPage = url.searchParams.has("page") || url.searchParams.has("pageSize");
    if (!hasPage) {
      const list = await prisma.serviceRequest.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          workOrder: {
            select: {
              id: true,
              number: true,
              team: true,
              scheduledDate: true,
            },
          },
          complaint: {
            select: {
              id: true,
              category: true,
              status: true,
            },
          },
        },
      });
      return NextResponse.json(list);
    }

    const page = z.coerce.number().int().positive().default(1).parse(url.searchParams.get("page"));
    const pageSize = z.coerce
      .number()
      .int()
      .positive()
      .max(100)
      .default(20)
      .parse(url.searchParams.get("pageSize"));

    const total = await prisma.serviceRequest.count();
    const list = await prisma.serviceRequest.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        workOrder: {
          select: {
            id: true,
            number: true,
            team: true,
            scheduledDate: true,
          },
        },
        complaint: {
          select: {
            id: true,
            category: true,
            status: true,
          },
        },
      },
    });
    return NextResponse.json({ total, items: list });
  } catch (e) {
    return handleApiError(e);
  }
}
