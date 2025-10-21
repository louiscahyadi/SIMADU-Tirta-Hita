import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { serviceRequestSchema } from "@/lib/schemas/serviceRequest";

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  const role = (token as any)?.role as string | undefined;
  if (role !== "humas") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json();
  const data = serviceRequestSchema.parse(raw);

  const created = await prisma.serviceRequest.create({
    data: {
      // kompatibilitas tampilan lama
      customerName: data.reporterName,
      address: data.address,
      phone: data.reporterPhone,

      // PSP fields
      reporterName: data.reporterName,
      reporterPhone: data.reporterPhone,
      description: data.description,
      urgency: data.urgency, // sudah LOW|MEDIUM|HIGH
      requestDate: data.requestDate,
      notes: data.notes ?? null,
    },
  });

  if (data.caseId) {
    await prisma.complaint
      .update({
        where: { id: data.caseId },
        data: { serviceRequestId: created.id, processedAt: new Date() },
      })
      .catch(() => {});
  }

  return NextResponse.json(created);
}

export async function GET(req: Request) {
  // Ensure request is authenticated
  const token = await getToken({ req: req as any, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const hasPage = url.searchParams.has("page") || url.searchParams.has("pageSize");
  if (!hasPage) {
    const list = await prisma.serviceRequest.findMany({ orderBy: { createdAt: "desc" } });
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

  const total = await prisma.serviceRequest.count();
  const list = await prisma.serviceRequest.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return NextResponse.json({ total, items: list });
}
