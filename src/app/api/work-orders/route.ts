import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { workOrderSchema } from "@/lib/schemas/workOrder";

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  const role = (token as any)?.role as string | undefined;
  if (!(role === "distribusi")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const raw = await req.json();
    const data = workOrderSchema.parse(raw);

    const created = await prisma.$transaction(async (tx) => {
      // Validate complaint and PSP linkage
      const complaint = await tx.complaint.findUnique({ where: { id: data.caseId } });
      if (!complaint) throw new Error("Kasus tidak ditemukan");
      if (complaint.serviceRequestId !== data.pspId) {
        throw new Error("PSP tidak sesuai dengan kasus");
      }

      const wo = await tx.workOrder.create({
        data: {
          number: data.workOrderNumber ?? null,
          team: data.teamName,
          technicians: data.technicians,
          scheduledDate: data.scheduledDate,
          instructions: data.instructions ?? null,
          // keep compatibility with existing fields when possible
          executorName: null,
          reporterName: null,
          handlingTime: null,
          disturbanceLocation: null,
          disturbanceType: null,
          city: null,
          cityDate: null,
          handledDate: null,
          reportDate: null,
          serviceRequest: { connect: { id: data.pspId } },
        },
      });

      // Attach to complaint and update status + history
      await tx.complaint.update({
        where: { id: complaint.id },
        data: { workOrderId: wo.id, status: "SPK_CREATED" as any, processedAt: new Date() },
      });
      await (tx as any).statusHistory.create({
        data: {
          complaintId: complaint.id,
          status: "SPK_CREATED",
          actorRole: "distribusi",
          actorId: (token as any)?.sub ?? null,
          note: null,
        },
      });

      return wo;
    });
    return NextResponse.json(created);
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.flatten?.() ?? String(e) }, { status: 400 });
    }
    const msg = typeof e?.message === "string" ? e.message : "Gagal menyimpan";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const token = await getToken({ req: req as any, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const hasPage = url.searchParams.has("page") || url.searchParams.has("pageSize");
  if (!hasPage) {
    const list = await prisma.workOrder.findMany({ orderBy: { createdAt: "desc" } });
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
  const total = await prisma.workOrder.count();
  const items = await prisma.workOrder.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return NextResponse.json({ total, items });
}
