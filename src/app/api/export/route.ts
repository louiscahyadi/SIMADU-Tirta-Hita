import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { env } from "@/lib/env";
import { AppError, errorResponse, handleApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  buildWhereClause,
  buildOrderBy,
  buildComplaintStatusFilter,
  SEARCH_FIELDS,
  SORT_FIELDS,
} from "@/lib/queryBuilder";

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

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET }).catch(() => null);
    if (!token) return errorResponse(AppError.unauthorized());
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

    if (tab === "complaint") {
      const where = buildWhereClause({
        dateRange: { from, to },
        searchTerm: q,
        searchFields: SEARCH_FIELDS.complaint,
        additionalConditions: buildComplaintStatusFilter(status),
      });

      const rows = await prisma.complaint.findMany({
        where,
        orderBy: buildOrderBy(sortBy, sortOrder, SORT_FIELDS.complaint),
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
      const where = buildWhereClause({
        dateRange: { from, to },
        searchTerm: q,
        searchFields: SEARCH_FIELDS.serviceRequest,
      });

      const rows = await prisma.serviceRequest.findMany({
        where,
        orderBy: buildOrderBy(sortBy, sortOrder, SORT_FIELDS.serviceRequest),
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
      const where = buildWhereClause({
        dateRange: { from, to },
        searchTerm: q,
        searchFields: SEARCH_FIELDS.workOrder,
      });

      const rows = await prisma.workOrder.findMany({
        where,
        orderBy: buildOrderBy(sortBy, sortOrder, SORT_FIELDS.workOrder),
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
    const where = buildWhereClause({
      dateRange: { from, to },
      searchTerm: q,
      searchFields: SEARCH_FIELDS.repairReport,
    });

    const rows = await prisma.repairReport.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder, SORT_FIELDS.repairReport),
    });
    const headers = ["createdAt", "city", "team", "actions", "notHandledReasons", "authorizedBy"];
    const csv = toCsv(rows, headers, (r, h) => r[h]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=repair_reports.csv",
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
