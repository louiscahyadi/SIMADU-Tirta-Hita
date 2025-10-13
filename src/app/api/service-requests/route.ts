import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { serviceRequestSchema } from "@/lib/schemas/serviceRequest";

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  const role = (token as any)?.role as string | undefined;
  if (!(role === "admin" || role === "humas")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const raw = await req.json();
  const data = serviceRequestSchema.parse(raw);

  const parseDate = (v?: string) => (v ? new Date(v) : null);

  const created = await prisma.serviceRequest.create({
    data: {
      customerName: data.customerName,
      address: data.address,
      serviceNumber: data.serviceNumber ?? null,
      phone: data.phone ?? null,
      receivedAt: parseDate(data.receivedAt) ?? undefined,
      receivedBy: data.receivedBy ?? null,
      handledAt: parseDate(data.handledAt) ?? undefined,
      handlerName: data.handlerName ?? null,
      inspectedAt: parseDate(data.inspectedAt) ?? undefined,
      inspectorName: data.inspectorName ?? null,
      reasons: JSON.stringify(Array.isArray(data.reasons) ? data.reasons : []),
      otherReason: data.otherReason ?? null,
      actionTaken: data.actionTaken ?? null,
      serviceCostBy: data.serviceCostBy ?? null,
      handoverReceiver: data.handoverReceiver ?? null,
      handoverCustomer: data.handoverCustomer ?? null,
      handoverAt: parseDate(data.handoverAt) ?? undefined,
    },
  });

  return NextResponse.json({
    ...created,
    reasons: JSON.parse(created.reasons ?? "[]"),
  });
}

export async function GET(req: Request) {
  // Ensure request is authenticated
  const token = await getToken({ req: req as any, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const list = await prisma.serviceRequest.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    list.map((i: any) => ({ ...i, reasons: JSON.parse(i.reasons ?? "[]") })),
  );
}
