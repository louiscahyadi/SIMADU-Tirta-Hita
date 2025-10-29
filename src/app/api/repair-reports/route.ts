import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { assertCanCreateRR, verifyCaseConsistency } from "@/lib/caseLinks";
import { ComplaintFlow } from "@/lib/complaintStatus";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { repairReportSchema } from "@/lib/schemas/repairReport";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  const role = token?.role;
  if (!(role === "distribusi")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const raw = await req.json();
    const data = repairReportSchema.parse(raw);

    const created = await prisma.$transaction(async (tx) => {
      await assertCanCreateRR(tx, data.caseId, data.spkId);

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
      await ComplaintFlow.markRRCreated(tx, data.caseId, rr.id, {
        actorRole: "distribusi",
        actorId: token?.sub ?? null,
        note: "BAP dibuat",
      });

      // 2) Final status based on result (COMPLETED or MONITORING)
      if (data.result === "MONITORING") {
        await ComplaintFlow.markMonitoring(tx, data.caseId, {
          actorRole: "distribusi",
          actorId: token?.sub ?? null,
          note: "BAP dikirim, hasil = MONITORING",
        });
      } else {
        // Default to COMPLETED for FIXED and any other terminal result except MONITORING
        await ComplaintFlow.markCompleted(tx, data.caseId, {
          actorRole: "distribusi",
          actorId: token?.sub ?? null,
          note: `BAP dikirim, hasil = ${data.result}`,
        });
      }

      // Ensure complaint link fields match the SR→WO→RR chain
      await verifyCaseConsistency(tx, data.caseId, { fix: true });

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

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
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
