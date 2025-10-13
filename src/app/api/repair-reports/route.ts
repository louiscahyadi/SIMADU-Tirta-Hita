import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { repairReportSchema } from "@/lib/schemas/repairReport";

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  const role = (token as any)?.role as string | undefined;
  if (!(role === "admin" || role === "distribusi")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const raw = await req.json();
  const data = repairReportSchema.parse(raw);
  const parseDate = (v?: string) => (v ? new Date(v) : null);
  const created = await prisma.$transaction(async (tx) => {
    const rr = await tx.repairReport.create({
      data: {
        actions: JSON.stringify(Array.isArray(data.actions) ? data.actions : []),
        otherActions: data.otherActions ?? null,
        notHandledReasons: JSON.stringify(
          Array.isArray(data.notHandledReasons) ? data.notHandledReasons : [],
        ),
        otherNotHandled: data.otherNotHandled ?? null,
        city: data.city ?? null,
        cityDate: parseDate(data.cityDate) ?? undefined,
        executorName: data.executorName ?? null,
        team: data.team ?? null,
        authorizedBy: data.authorizedBy ?? null,
        ...(data.workOrderId ? { workOrder: { connect: { id: data.workOrderId } } } : {}),
      },
    });
    if (data.workOrderId) {
      const res1 = await (tx as any).complaint.updateMany({
        where: { workOrderId: data.workOrderId, repairReportId: null },
        data: { repairReportId: rr.id, updatedAt: new Date() },
      });
      if ((res1?.count ?? 0) === 0) {
        const wo = await tx.workOrder.findUnique({
          where: { id: data.workOrderId },
          select: { serviceRequestId: true },
        });
        if (wo?.serviceRequestId) {
          await (tx as any).complaint.updateMany({
            where: { serviceRequestId: wo.serviceRequestId, repairReportId: null },
            data: { repairReportId: rr.id, updatedAt: new Date() },
          });
        }
      }
    }
    return rr;
  });
  return NextResponse.json({
    ...created,
    actions: JSON.parse(created.actions ?? "[]"),
    notHandledReasons: JSON.parse(created.notHandledReasons ?? "[]"),
  });
}

export async function GET(req: Request) {
  const token = await getToken({ req: req as any, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const list = await prisma.repairReport.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    list.map((i: any) => ({
      ...i,
      actions: JSON.parse(i.actions ?? "[]"),
      notHandledReasons: JSON.parse(i.notHandledReasons ?? "[]"),
    })),
  );
}
