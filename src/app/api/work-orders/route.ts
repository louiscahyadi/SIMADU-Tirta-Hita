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
  const created = await prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.create({
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
    if (data.serviceRequestId) {
      await (tx as any).complaint.updateMany({
        where: { serviceRequestId: data.serviceRequestId, workOrderId: null },
        data: { workOrderId: wo.id, updatedAt: new Date(), processedAt: new Date() },
      });
    }
    return wo;
  });
  return NextResponse.json(created);
}

export async function GET(req: Request) {
  const token = await getToken({ req: req as any, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const list = await prisma.workOrder.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
}
