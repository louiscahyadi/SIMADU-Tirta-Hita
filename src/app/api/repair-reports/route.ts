import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { ComplaintFlow } from "@/lib/complaintStatus";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { repairReportSchema } from "@/lib/schemas/repairReport";

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  const role = (token as any)?.role as string | undefined;
  if (!(role === "distribusi")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const raw = await req.json();
    const data = repairReportSchema.parse(raw);

    const created = await prisma.$transaction(async (tx) => {
      // Validate complaint and SPK linkage
      const complaint = await tx.complaint.findUnique({ where: { id: data.caseId } });
      if (!complaint) throw new Error("Kasus tidak ditemukan");
      if (complaint.workOrderId !== data.spkId) {
        throw new Error("SPK tidak sesuai dengan kasus");
      }
      // Only allow creating BAP when current case status is SPK_CREATED
      if ((complaint as any).status !== "SPK_CREATED") {
        throw new Error("BAP hanya bisa dibuat ketika status kasus = SPK_CREATED");
      }
      // Guard: one BAP per Case
      if (complaint.repairReportId) {
        throw new Error("Sudah ada BAP untuk kasus ini");
      }

      // ensure work order exists
      const wo = await tx.workOrder.findUnique({ where: { id: data.spkId } });
      if (!wo) throw new Error("SPK tidak ditemukan");

      const rr = await tx.repairReport.create({
        data: {
          actionTaken: data.actionTaken,
          startTime: new Date(data.startTime),
          endTime: new Date(data.endTime),
          result: data.result as any,
          remarks: data.remarks ?? null,
          customerConfirmationName: data.customerConfirmationName ?? null,
          workOrder: { connect: { id: data.spkId } },
        },
      });

      // Two-step status tracking:
      // 1) RR_CREATED when BAP is created
      await ComplaintFlow.markRRCreated(tx, complaint.id, rr.id, {
        actorRole: "distribusi",
        actorId: (token as any)?.sub ?? null,
        note: "BAP dibuat",
      });

      // 2) Final status based on result (COMPLETED or MONITORING)
      if (data.result === "MONITORING") {
        await ComplaintFlow.markMonitoring(tx, complaint.id, {
          actorRole: "distribusi",
          actorId: (token as any)?.sub ?? null,
          note: "BAP dikirim, hasil = MONITORING",
        });
      } else {
        // Default to COMPLETED for FIXED and any other terminal result except MONITORING
        await ComplaintFlow.markCompleted(tx, complaint.id, {
          actorRole: "distribusi",
          actorId: (token as any)?.sub ?? null,
          note: `BAP dikirim, hasil = ${data.result}`,
        });
      }

      return rr;
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
