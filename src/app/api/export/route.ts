import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

function getParam(sp: URLSearchParams, key: string) {
  const v = sp.get(key);
  return v ?? undefined;
}

function parseDateInput(v?: string) {
  if (!v) return undefined as Date | undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

function toCsv(rows: any[], headers: string[], selector: (r: any, h: string) => any) {
  const escape = (val: any) => {
    if (val == null) return "";
    const s = (typeof val === "object" ? JSON.stringify(val) : String(val)).replace(/\r?\n/g, " ");
    if (s.includes(",") || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escape(selector(r, h))).join(","));
  }
  return lines.join("\r\n");
}

export async function GET(req: Request) {
  const token = await getToken({ req: req as any, secret: env.NEXTAUTH_SECRET }).catch(() => null);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const sp = url.searchParams;
  const tab = (getParam(sp, "tab") || "service") as
    | "complaint"
    | "service"
    | "workorder"
    | "repair";
  const q = (getParam(sp, "q") || "").trim();
  const from = parseDateInput(getParam(sp, "from"));
  const to = parseDateInput(getParam(sp, "to"));
  const status = (getParam(sp, "status") || "").trim();
  const sortBy = (getParam(sp, "sortBy") || "createdAt").trim();
  const sortOrder = ((getParam(sp, "sortOrder") || "desc").trim() === "asc" ? "asc" : "desc") as
    | "asc"
    | "desc";

  // Normalize end-of-day
  let toEnd: Date | undefined = undefined;
  if (to) {
    toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
  }
  const dateRange = from || toEnd ? { gte: from, lte: toEnd } : undefined;

  function buildOrderBy(allowed: string[]) {
    const field = allowed.includes(sortBy) ? sortBy : "createdAt";
    return { [field]: sortOrder } as any;
  }

  if (tab === "complaint") {
    const where: any = {
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(q
        ? {
            OR: [
              { customerName: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
              { connectionNumber: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { complaintText: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status === "baru"
        ? {
            AND: [
              { processedAt: null },
              { serviceRequestId: null },
              { workOrderId: null },
              { repairReportId: null },
            ],
          }
        : status === "processed"
          ? {
              OR: [
                { processedAt: { not: null } },
                { serviceRequestId: { not: null } },
                { workOrderId: { not: null } },
                { repairReportId: { not: null } },
              ],
            }
          : {}),
    };
    const rows = await prisma.complaint.findMany({
      where,
      orderBy: buildOrderBy(["createdAt", "customerName", "category"]),
    });
    const headers = [
      "createdAt",
      "customerName",
      "address",
      "connectionNumber",
      "phone",
      "category",
      "complaintText",
      "processedAt",
    ];
    const csv = toCsv(rows, headers, (r, h) => r[h]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=complaints.csv",
      },
    });
  }

  if (tab === "service") {
    const where: any = {
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(q
        ? {
            OR: [
              { customerName: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
              { serviceNumber: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { receivedBy: { contains: q, mode: "insensitive" } },
              { handlerName: { contains: q, mode: "insensitive" } },
              { inspectorName: { contains: q, mode: "insensitive" } },
              { actionTaken: { contains: q, mode: "insensitive" } },
              { serviceCostBy: { contains: q, mode: "insensitive" } },
              { handoverReceiver: { contains: q, mode: "insensitive" } },
              { handoverCustomer: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const rows = await prisma.serviceRequest.findMany({
      where,
      orderBy: buildOrderBy([
        "createdAt",
        "customerName",
        "address",
        "serviceNumber",
        "handlerName",
      ]),
    });
    const headers = [
      "createdAt",
      "customerName",
      "address",
      "serviceNumber",
      "phone",
      "handlerName",
      "reasons",
      "actionTaken",
    ];
    const csv = toCsv(rows, headers, (r, h) => r[h]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=service_requests.csv",
      },
    });
  }

  if (tab === "workorder") {
    const where: any = {
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(q
        ? {
            OR: [
              { number: { contains: q, mode: "insensitive" } },
              { reporterName: { contains: q, mode: "insensitive" } },
              { handlingTime: { contains: q, mode: "insensitive" } },
              { disturbanceLocation: { contains: q, mode: "insensitive" } },
              { disturbanceType: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { executorName: { contains: q, mode: "insensitive" } },
              { team: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const rows = await prisma.workOrder.findMany({
      where,
      orderBy: buildOrderBy([
        "createdAt",
        "number",
        "reporterName",
        "disturbanceLocation",
        "disturbanceType",
        "team",
      ]),
    });
    const headers = [
      "createdAt",
      "number",
      "reporterName",
      "disturbanceLocation",
      "disturbanceType",
      "team",
    ];
    const csv = toCsv(rows, headers, (r, h) => r[h]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=work_orders.csv",
      },
    });
  }

  // repair
  const where: any = {
    ...(dateRange ? { createdAt: dateRange } : {}),
    ...(q
      ? {
          OR: [
            { city: { contains: q, mode: "insensitive" } },
            { executorName: { contains: q, mode: "insensitive" } },
            { team: { contains: q, mode: "insensitive" } },
            { authorizedBy: { contains: q, mode: "insensitive" } },
            { otherActions: { contains: q, mode: "insensitive" } },
            { otherNotHandled: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const rows = await prisma.repairReport.findMany({
    where,
    orderBy: buildOrderBy(["createdAt", "city", "team", "authorizedBy"]),
  });
  const headers = ["createdAt", "city", "team", "actions", "notHandledReasons", "authorizedBy"];
  const csv = toCsv(rows, headers, (r, h) => r[h]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=repair_reports.csv",
    },
  });
}
