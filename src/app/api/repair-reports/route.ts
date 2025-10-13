import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

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
        actions: Array.isArray(data.actions) ? (data.actions as any) : [],
        otherActions: data.otherActions ?? null,
        notHandledReasons: Array.isArray(data.notHandledReasons)
          ? (data.notHandledReasons as any)
          : [],
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
  });
}

export async function GET(req: Request) {
  const token = await getToken({ req: req as any, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const hasPage = url.searchParams.has("page") || url.searchParams.has("pageSize");
  if (!hasPage) {
    const list = await prisma.repairReport.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(list);
  }
  const page = z.coerce.number().int().positive().default(1).parse(url.searchParams.get("page"));
  const pageSize = z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(10)
    .parse(url.searchParams.get("pageSize"));
  const total = await prisma.repairReport.count();
  const list = await prisma.repairReport.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return NextResponse.json({ total, items: list });
}
