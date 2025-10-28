import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { ComplaintFlow } from "@/lib/complaintStatus";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  complaintCreateSchema,
  complaintQuerySchema,
  complaintUpdateSchema,
} from "@/lib/schemas/complaints";

export async function POST(req: NextRequest) {
  try {
    // Allow both public submissions and HUMAS staff
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
    const role = (token as any)?.role as string | undefined;
    const isHumas = role === "humas";
    const isPublic = !token; // No token means public submission

    // Parse and validate the request body
    const raw = await req.json();
    const data = complaintCreateSchema.parse(raw);

    const created = await prisma.$transaction(async (tx) => {
      const comp = await tx.complaint.create({
        data: {
          customerName: data.customerName,
          address: data.address,
          mapsLink: data.mapsLink,
          connectionNumber: data.connectionNumber,
          phone: data.phone,
          complaintText: data.complaintText,
          category: data.category,
          processedAt: data.processedAt ? new Date(data.processedAt) : undefined,
        },
        select: { id: true },
      });
      // Write initial status history (REPORTED)
      await ComplaintFlow.markReported(tx, comp.id, {
        actorRole: isPublic ? "public" : "humas",
        actorId: isPublic ? null : ((token as any)?.sub ?? null),
        note: isPublic ? "Pengaduan dari publik" : "Kasus dibuat",
      });
      return comp;
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.name === "ZodError") return NextResponse.json({ error: e.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Require an authenticated session/token; don't rely solely on middleware
  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const query = complaintQuerySchema.parse({
    q: searchParams.get("q") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    page: searchParams.get("page") || undefined,
    pageSize: searchParams.get("pageSize") || undefined,
  });

  let toEnd: Date | undefined;
  const fromDate = query.from ? new Date(query.from) : undefined;
  const toDate = query.to ? new Date(query.to) : undefined;
  if (toDate) {
    toEnd = new Date(toDate);
    toEnd.setHours(23, 59, 59, 999);
  }

  const where: any = {
    ...(fromDate || toEnd ? { createdAt: { gte: fromDate, lte: toEnd } } : {}),
    ...(query.q
      ? {
          OR: [
            { customerName: { contains: query.q, mode: "insensitive" } },
            { address: { contains: query.q, mode: "insensitive" } },
            { connectionNumber: { contains: query.q, mode: "insensitive" } },
            { phone: { contains: query.q, mode: "insensitive" } },
            { complaintText: { contains: query.q, mode: "insensitive" } },
            { category: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const total = await prisma.complaint.count({ where });
  const items = await prisma.complaint.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  });

  return NextResponse.json({ total, items });
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
    const role = (token as any)?.role as string | undefined;
    if (!(role === "humas" || role === "distribusi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const idFromQuery = searchParams.get("id") || undefined;
    const raw = await req.json().catch(() => ({}));
    const parsed = complaintUpdateSchema.parse({ ...raw, id: raw?.id ?? idFromQuery });

    if (!parsed.id) {
      return NextResponse.json({ error: "id wajib" }, { status: 400 });
    }

    const updateData: any = {};
    if ("serviceRequestId" in parsed) updateData.serviceRequestId = parsed.serviceRequestId ?? null;
    if ("workOrderId" in parsed) updateData.workOrderId = parsed.workOrderId ?? null;
    if ("repairReportId" in parsed) updateData.repairReportId = parsed.repairReportId ?? null;
    if ("processedAt" in parsed) {
      updateData.processedAt =
        parsed.processedAt === null ? null : new Date(parsed.processedAt as string);
    }

    const updated = await prisma.complaint.update({
      where: { id: parsed.id },
      data: updateData,
      select: {
        id: true,
        processedAt: true,
        serviceRequestId: true,
        workOrderId: true,
        repairReportId: true,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if ((e as any)?.name === "ZodError") {
      return NextResponse.json({ error: (e as any).flatten?.() ?? String(e) }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal update" }, { status: 500 });
  }
}
