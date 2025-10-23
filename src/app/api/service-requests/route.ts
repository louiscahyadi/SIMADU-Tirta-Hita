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

  const created = await prisma.$transaction(async (tx) => {
    if (data.caseId) {
      // Validate the case exists and is in the correct state, and ensure only one PSP per case
      const comp = await tx.complaint.findUnique({ where: { id: data.caseId } });
      if (!comp) throw new Error("Kasus tidak ditemukan");
      // Only allow PSP creation when status is 'REPORTED' (maps to NEW)
      if ((comp as any).status !== "REPORTED") {
        throw new Error("PSP hanya bisa dibuat ketika status kasus = NEW");
      }
      if (comp.serviceRequestId) {
        throw new Error("Sudah ada PSP untuk kasus ini");
      }
    }
    const sr = await tx.serviceRequest.create({
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
      // Link complaint to SR, set status, and write history if complaint exists
      const comp = await tx.complaint.findUnique({ where: { id: data.caseId } });
      if (comp) {
        await tx.complaint.update({
          where: { id: comp.id },
          data: {
            serviceRequestId: sr.id,
            processedAt: new Date(),
            status: "PSP_CREATED" as any,
          },
        });
        await tx.statusHistory.create({
          data: {
            complaintId: comp.id,
            status: "PSP_CREATED",
            actorRole: "humas",
            actorId: (token as any)?.sub ?? null,
            note: null,
          },
        });
      }
    }

    return sr;
  });

  return NextResponse.json(created);
}

export async function PATCH(req: Request) {
  const token = await getToken({ req: req as any, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  const role = (token as any)?.role as string | undefined;
  if (role !== "humas") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const raw = await req.json();
    const url = new URL(req.url);
    const id = (raw?.id as string | undefined) ?? (url.searchParams.get("id") || undefined);
    if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

    // Allow partial updates of PSP fields only if SPK belum dibuat
    const { z } = await import("zod");
    const updateSchema = z
      .object({
        id: z.string().min(1),
        reporterName: z.string().trim().min(2).max(100).optional(),
        reporterPhone: z
          .string()
          .trim()
          .min(8)
          .max(20)
          .regex(/^[+\d ]+$/)
          .optional(),
        address: z.string().trim().min(5).max(200).optional(),
        description: z.string().trim().min(10).max(2000).optional(),
        urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
        requestDate: z.coerce.date().optional(),
        notes: z.string().trim().max(2000).optional(),
      })
      .strict();

    const data = updateSchema.parse({ ...raw, id });

    const updated = await prisma.$transaction(async (tx) => {
      const sr = await tx.serviceRequest.findUnique({
        where: { id: data.id },
        include: { workOrder: true },
      });
      if (!sr) throw new Error("PSP tidak ditemukan");
      if (sr.workOrder) throw new Error("PSP tidak bisa diubah setelah SPK dibuat");

      const next = await tx.serviceRequest.update({
        where: { id: data.id },
        data: {
          reporterName: data.reporterName ?? undefined,
          reporterPhone: data.reporterPhone ?? undefined,
          address: data.address ?? undefined,
          description: data.description ?? undefined,
          urgency: (data.urgency as any) ?? undefined,
          requestDate: data.requestDate ?? undefined,
          notes: data.notes === undefined ? undefined : data.notes || null,
        },
      });
      return next;
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return NextResponse.json({ error: e.flatten?.() ?? String(e) }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message || "Gagal menyimpan" }, { status: 400 });
  }
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
