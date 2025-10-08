import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { workOrderSchema } from "@/lib/schemas/workOrder";

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  const role = (token as any)?.role as string | undefined;
  if (!(role === "admin" || role === "distribusi")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const raw = await req.json();
  const data = workOrderSchema.parse(raw);
  const parseDate = (v?: string) => (v ? new Date(v) : null);
  const created = await prisma.workOrder.create({
    data: {
      reportDate: parseDate(data.reportDate) ?? undefined,
      number: data.number ?? null,
      handledDate: parseDate(data.handledDate) ?? undefined,
      reporterName: data.reporterName ?? null,
      handlingTime: data.handlingTime ?? null,
      disturbanceLocation: data.disturbanceLocation ?? null,
      disturbanceType: data.disturbanceType ?? null,
      city: data.city ?? null,
      cityDate: parseDate(data.cityDate) ?? undefined,
      executorName: data.executorName ?? null,
      team: data.team ?? null,
      ...(data.serviceRequestId
        ? { serviceRequest: { connect: { id: data.serviceRequestId } } }
        : {}),
    },
  });
  // Best-effort: automatically link this WO back to a Complaint (if the flow lost complaintId)
  // We update the complaint where serviceRequestId matches, but only if workOrderId is still null.
  if (data.serviceRequestId) {
    try {
      await (prisma as any).complaint.updateMany({
        where: { serviceRequestId: data.serviceRequestId, workOrderId: null },
        data: { workOrderId: created.id, updatedAt: new Date(), processedAt: new Date() },
      });
    } catch {
      // ignore linking errors; creation succeeded
    }
  }
  return NextResponse.json(created);
}

export async function GET() {
  const list = await prisma.workOrder.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
}
