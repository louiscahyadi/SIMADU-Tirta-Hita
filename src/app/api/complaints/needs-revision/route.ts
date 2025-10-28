import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  caseId: z.string().min(1),
  note: z.string().max(2000).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  const role = token?.role;
  if (!(role === "distribusi")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const raw = await req.json();
    const data = bodySchema.parse(raw);

    const updated = await prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.findUnique({ where: { id: data.caseId } });
      if (!complaint) throw new Error("Kasus tidak ditemukan");
      if ((complaint as any).status !== "SPK_CREATED") {
        throw new Error("Aksi NEEDS_REVISION hanya diperbolehkan saat status = SPK_CREATED");
      }

      const res = await tx.complaint.update({
        where: { id: complaint.id },
        data: { status: "PSP_CREATED" as any, updatedAt: new Date() },
        select: { id: true, status: true },
      });
      await tx.statusHistory.create({
        data: {
          complaintId: complaint.id,
          status: "PSP_CREATED",
          actorRole: "distribusi",
          actorId: token?.sub ?? null,
          note: data.note ? `NEEDS_REVISION: ${data.note}` : "NEEDS_REVISION",
        },
      });
      return res;
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.flatten?.() ?? String(e) }, { status: 400 });
    }
    const msg = typeof e?.message === "string" ? e.message : "Gagal memproses";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
