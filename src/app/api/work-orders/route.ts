import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

import { assertCanCreateWO, verifyCaseConsistency } from "@/lib/caseLinks";
import { ComplaintFlow } from "@/lib/complaintStatus";
import { env } from "@/lib/env";
import { AppError, errorResponse, handleApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { workOrderSchema } from "@/lib/schemas/workOrder";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  const role = token?.role;
  if (!(role === "distribusi")) {
    return errorResponse(AppError.forbidden(role ?? null, "distribusi"));
  }
  try {
    const raw = await req.json();
    const data = workOrderSchema.parse(raw);

    const created = await prisma.$transaction(async (tx) => {
      await assertCanCreateWO(tx, data.caseId, data.pspId);

      // Prepare work order data with signature fields
      const woData: any = {
        number: data.workOrderNumber ?? null,
        reportDate: (data as any).reportDate ?? null,
        team: data.teamName,
        technicians: data.technicians,
        scheduledDate: data.scheduledDate,
        instructions: data.instructions ?? null,
        handledDate: (data as any).handledDate ?? null,
        reporterName: (data as any).reporterName ?? null,
        handlingTime: (data as any).handlingTime ?? null,
        disturbanceLocation: (data as any).disturbanceLocation ?? null,
        disturbanceType: (data as any).disturbanceType ?? null,
        // keep compatibility with existing fields when possible
        executorName: null,
        city: null,
        cityDate: null,
        serviceRequest: { connect: { id: data.pspId } },
      };

      // Add digital signature fields if present
      if ((data as any).creatorSignature) {
        woData.creatorSignature = (data as any).creatorSignature;
        woData.creatorSignedAt = new Date();
        woData.creatorSignedBy = token?.name ?? token?.sub ?? "Unknown";
      }

      const wo = await tx.workOrder.create({
        data: woData,
      });

      // Attach to complaint and update status + history via helper
      await ComplaintFlow.markSPKCreated(tx, data.caseId, wo.id, {
        actorRole: "distribusi",
        actorId: token?.sub ?? null,
        note: null,
      });

      // Ensure complaint link fields match the SR→WO→RR chain
      await verifyCaseConsistency(tx, data.caseId, { fix: true });

      return wo;
    });
    return NextResponse.json(created);
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return errorResponse(AppError.validation(e.flatten?.() ?? undefined));
    }
    return handleApiError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
    if (!token) return errorResponse(AppError.unauthorized());
    const url = new URL(req.url);
    const hasPage = url.searchParams.has("page") || url.searchParams.has("pageSize");
    if (!hasPage) {
      const list = await prisma.workOrder.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          serviceRequest: {
            select: {
              id: true,
              reporterName: true,
              customerName: true,
              address: true,
              urgency: true,
            },
          },
          repairReport: {
            select: {
              id: true,
              result: true,
              startTime: true,
              endTime: true,
            },
          },
          complaint: {
            select: {
              id: true,
              category: true,
              status: true,
            },
          },
        },
      });
      return NextResponse.json(list);
    }
    const page = z.coerce.number().int().positive().default(1).parse(url.searchParams.get("page"));
    const pageSize = z.coerce
      .number()
      .int()
      .positive()
      .max(100)
      .default(20)
      .parse(url.searchParams.get("pageSize"));
    const total = await prisma.workOrder.count();
    const items = await prisma.workOrder.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        serviceRequest: {
          select: {
            id: true,
            reporterName: true,
            customerName: true,
            address: true,
            urgency: true,
          },
        },
        repairReport: {
          select: {
            id: true,
            result: true,
            startTime: true,
            endTime: true,
          },
        },
        complaint: {
          select: {
            id: true,
            category: true,
            status: true,
          },
        },
      },
    });
    return NextResponse.json({ total, items });
  } catch (e) {
    return handleApiError(e);
  }
}
