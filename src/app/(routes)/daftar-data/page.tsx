import Link from "next/link";
import { getServerSession } from "next-auth";
import React from "react";

import Breadcrumbs from "@/components/Breadcrumbs";
import PrintButton from "@/components/PrintButton";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entityLabel, entityAbbr } from "@/lib/uiLabels";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

// Tabs and helpers
type TabId = "complaint" | "service" | "workorder" | "repair";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "complaint", label: entityLabel("complaint") },
  { id: "service", label: entityLabel("serviceRequest") },
  { id: "workorder", label: entityLabel("workOrder") },
  { id: "repair", label: entityLabel("repairReport") },
];

function joinJsonArray(value?: string | null): string {
  if (!value) return "-";
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((v) => typeof v === "string" && v.trim().length).join(", ") || "-";
    }
  } catch {
    // fallthrough to raw string
  }
  return value || "-";
}

function getParam(sp: PageProps["searchParams"], key: string) {
  const v = sp?.[key];
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

function parseDateInput(v?: string) {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

function formatDate(d?: Date | string | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(dt);
  } catch {
    return "-";
  }
}

function TabLink({ id, active, sp }: { id: TabId; active: boolean; sp: URLSearchParams }) {
  const href = new URLSearchParams(sp);
  href.set("tab", id);
  return (
    <Link
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active ? "bg-white text-gray-900 shadow" : "text-gray-700 hover:bg-white/70"
      }`}
      href={`?${href.toString()}`}
    >
      {tabs.find((t) => t.id === id)?.label}
    </Link>
  );
}

function FilterBar({ sp }: { sp: URLSearchParams }) {
  const q = sp.get("q") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const tab = sp.get("tab") ?? "service";
  const pageSize = sp.get("pageSize") ?? "10";
  const status = sp.get("status") ?? ""; // complaint status filter
  // Simplified filter for complaint tab per UI reference
  if (tab === "complaint") {
    const exportSp = new URLSearchParams(sp);
    exportSp.set("tab", tab);
    exportSp.delete("page");
    exportSp.delete("pageSize");
    return (
      <div className="space-y-3">
        <div>
          <div className="font-medium">Filter</div>
          <div className="text-sm text-gray-500">
            Gunakan kata kunci, status, dan opsi lainnya lalu terapkan untuk memperbarui tabel.
          </div>
        </div>
        <form method="get" className="space-y-3">
          <input type="hidden" name="tab" value={tab} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <label className="text-sm text-gray-600">Kata kunci</label>
              <input
                name="q"
                defaultValue={q}
                placeholder="Cari nama, nomor, lokasi..."
                className="input"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-600">Status</label>
              <select name="status" defaultValue={status} className="input">
                <option value="">Semua</option>
                <option value="baru">Baru</option>
                <option value="processed">Diproses / Selesai</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-600">Baris per halaman</label>
              <select name="pageSize" defaultValue={pageSize} className="input">
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn">
              Terapkan Filter
            </button>
            <Link className="btn-outline" href={`?tab=${tab}`} title="Reset semua filter">
              Reset
            </Link>
            {/* Ekspor dihapus */}
          </div>
        </form>
      </div>
    );
  }
  // Date presets (7/30 hari)
  const today = new Date();
  const toStr = today.toISOString().slice(0, 10);
  const d7 = new Date(today);
  d7.setDate(today.getDate() - 6);
  const from7Str = d7.toISOString().slice(0, 10);
  const d30 = new Date(today);
  d30.setDate(today.getDate() - 29);
  const from30Str = d30.toISOString().slice(0, 10);
  // Preset: Bulan ini (1st day to today)
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const fromMonthStr = firstOfMonth.toISOString().slice(0, 10);
  const qspMonth = new URLSearchParams(sp);
  qspMonth.set("tab", tab);
  qspMonth.set("from", fromMonthStr);
  qspMonth.set("to", toStr);
  qspMonth.set("page", "1");
  // Preset: Tahun ini (Jan 1 to today)
  const firstOfYear = new Date(today.getFullYear(), 0, 1);
  const fromYearStr = firstOfYear.toISOString().slice(0, 10);
  const qspYear = new URLSearchParams(sp);
  qspYear.set("tab", tab);
  qspYear.set("from", fromYearStr);
  qspYear.set("to", toStr);
  qspYear.set("page", "1");
  // Preset: Hari ini (from = to = today)
  const qspToday = new URLSearchParams(sp);
  qspToday.set("tab", tab);
  qspToday.set("from", toStr);
  qspToday.set("to", toStr);
  qspToday.set("page", "1");
  // Preset: Minggu ini (Senin s/d hari ini)
  const startOfWeek = new Date(today);
  const day = startOfWeek.getDay();
  // Compute Monday as start (0=Sun, 1=Mon,...)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(today.getDate() + diffToMonday);
  const fromWeekStr = startOfWeek.toISOString().slice(0, 10);
  const qspWeek = new URLSearchParams(sp);
  qspWeek.set("tab", tab);
  qspWeek.set("from", fromWeekStr);
  qspWeek.set("to", toStr);
  qspWeek.set("page", "1");
  const qsp7 = new URLSearchParams(sp);
  qsp7.set("tab", tab);
  qsp7.set("from", from7Str);
  qsp7.set("to", toStr);
  qsp7.set("page", "1");
  const qsp30 = new URLSearchParams(sp);
  qsp30.set("tab", tab);
  qsp30.set("from", from30Str);
  qsp30.set("to", toStr);
  qsp30.set("page", "1");
  // Page size chips
  const sizes = ["5", "10", "20", "50"] as const;
  // Ekspor dihapus: tidak ada URL ekspor CSV
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="tab" value={tab} />
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Kata kunci</label>
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari nama, nomor, lokasi, dll"
          className="input"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Dari tanggal</label>
        <input type="date" name="from" defaultValue={from} className="input" />
      </div>
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Sampai tanggal</label>
        <input type="date" name="to" defaultValue={to} className="input" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">Rentang cepat</span>
        <div className="flex items-center gap-2">
          <Link
            className="text-blue-700 hover:underline text-sm"
            href={`?${qspToday.toString()}`}
            title="Hari ini"
          >
            Hari ini
          </Link>
          <Link
            className="text-blue-700 hover:underline text-sm"
            href={`?${qspWeek.toString()}`}
            title="Minggu ini"
          >
            Minggu ini
          </Link>
          <Link
            className="text-blue-700 hover:underline text-sm"
            href={`?${qspMonth.toString()}`}
            title="Bulan ini"
          >
            Bulan ini
          </Link>
          <Link
            className="text-blue-700 hover:underline text-sm"
            href={`?${qspYear.toString()}`}
            title="Tahun ini"
          >
            Tahun ini
          </Link>
          <Link
            className="text-blue-700 hover:underline text-sm"
            href={`?${qsp7.toString()}`}
            title="7 hari terakhir"
          >
            7 hari
          </Link>
          <Link
            className="text-blue-700 hover:underline text-sm"
            href={`?${qsp30.toString()}`}
            title="30 hari terakhir"
          >
            30 hari
          </Link>
        </div>
      </div>
      {tab === "complaint" && (
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Status</label>
          <select name="status" defaultValue={status} className="input">
            <option value="">Semua</option>
            <option value="baru">Baru</option>
            <option value="processed">Sudah diproses</option>
          </select>
        </div>
      )}
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Baris per halaman</label>
        <select name="pageSize" defaultValue={pageSize} className="input">
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">Cepat: baris/hal</span>
        <div className="flex items-center gap-2">
          {sizes.map((sz) => {
            const next = new URLSearchParams(sp);
            next.set("tab", tab);
            next.set("pageSize", sz);
            next.set("page", "1");
            const isActive = pageSize === sz;
            return (
              <Link
                key={sz}
                href={`?${next.toString()}`}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
                title={`Tampilkan ${sz} baris/halaman`}
              >
                {sz}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-sm">
          Terapkan Filter
        </button>
        <Link className="btn-outline btn-sm" href={`?tab=${tab}`} title="Reset semua filter">
          Reset
        </Link>
        <PrintButton />
        {/* Ekspor PDF/CSV dihapus */}
      </div>
    </form>
  );
}

export default async function DaftarDataPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role as string | undefined;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(v)) sp.set(k, v[0]!);
    else if (v != null) sp.set(k, v);
  }

  const active = (getParam(searchParams, "tab") as TabId) || "service";
  const q = (getParam(searchParams, "q") ?? "").trim();
  const from = parseDateInput(getParam(searchParams, "from"));
  const to = parseDateInput(getParam(searchParams, "to"));
  const sortBy = (getParam(searchParams, "sortBy") ?? "createdAt").trim();
  const sortOrder = (getParam(searchParams, "sortOrder") ?? "desc").trim() as "asc" | "desc";
  const pageSizeParam = parseInt(getParam(searchParams, "pageSize") || "10", 10);
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(Math.max(pageSizeParam, 1), 100)
      : 10;
  const pageParam = parseInt(getParam(searchParams, "page") || "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const statusFilter = (getParam(searchParams, "status") ?? "").trim();

  // Normalize range: include whole end day
  let toEnd: Date | undefined = undefined;
  if (to) {
    toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
  }
  const dateRange = from || toEnd ? { gte: from, lte: toEnd } : undefined;

  // Datasets
  let services: any[] = [];
  let workorders: any[] = [];
  let repairs: any[] = [];
  let complaints: any[] = [];
  let totalCount = 0;
  // Relation helpers (filled per-tab as needed)
  let srToWo = new Map<string, string>(); // ServiceRequest.id -> WorkOrder.id
  let woToRr = new Map<string, string>(); // WorkOrder.id -> RepairReport.id
  let woToSr = new Map<string, string>(); // WorkOrder.id -> ServiceRequest.id
  let woToComplaint = new Map<string, string>(); // WorkOrder.id -> Complaint.id
  let rrToComplaint = new Map<string, string>(); // RepairReport.id -> Complaint.id

  function buildOrderBy(allowed: string[]): any {
    const field = allowed.includes(sortBy) ? sortBy : "createdAt";
    const order = sortOrder === "asc" ? "asc" : "desc";
    return { [field]: order } as any;
  }

  function headerSortLink(label: string, field: string, currentTab: TabId): React.ReactElement {
    const allowedMap: Record<TabId, string[]> = {
      complaint: ["createdAt", "customerName", "category"],
      service: ["createdAt", "customerName", "address", "serviceNumber", "handlerName"],
      workorder: [
        "createdAt",
        "number",
        "reporterName",
        "disturbanceLocation",
        "disturbanceType",
        "team",
      ],
      repair: ["createdAt", "city", "team", "authorizedBy"],
    } as const;
    const allowed = allowedMap[currentTab];
    const isAllowed = allowed.includes(field);
    if (!isAllowed) return <span>{label}</span>;
    const next = new URLSearchParams(sp);
    next.set("tab", currentTab);
    next.set("sortBy", field);
    const isActive = sortBy === field;
    const nextOrder = isActive && sortOrder === "asc" ? "desc" : "asc";
    next.set("sortOrder", nextOrder);
    next.set("page", "1");
    return (
      <Link
        className={`group inline-flex items-center gap-1 hover:underline ${
          isActive ? "text-blue-700" : ""
        }`}
        href={`?${next.toString()}`}
      >
        {label}
        {isActive ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-3.5 w-3.5 opacity-70"
            aria-hidden
          >
            {sortOrder === "asc" ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 15l4-4 4 4" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 9l-4 4-4-4" />
            )}
          </svg>
        ) : null}
      </Link>
    );
  }

  if (active === "complaint") {
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
      ...(statusFilter === "baru"
        ? {
            AND: [
              { processedAt: null },
              { serviceRequestId: null },
              { workOrderId: null },
              { repairReportId: null },
            ],
          }
        : statusFilter === "processed"
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
    totalCount = await (prisma as any).complaint.count({ where });
    complaints = await (prisma as any).complaint.findMany({
      where,
      orderBy: buildOrderBy(["createdAt", "customerName", "category"]),
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  } else if (active === "service") {
    const where = {
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
    } as any;
    totalCount = await prisma.serviceRequest.count({ where });
    services = await prisma.serviceRequest.findMany({
      where,
      orderBy: buildOrderBy([
        "createdAt",
        "customerName",
        "address",
        "serviceNumber",
        "handlerName",
      ]),
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    // Build relations for badges (broad select and map in JS)
    const allWOs = (await (prisma as any).workOrder.findMany({
      select: { id: true, serviceRequestId: true },
    })) as Array<{ id: string; serviceRequestId: string | null }>;

    for (const w of allWOs) if (w.serviceRequestId) srToWo.set(w.serviceRequestId, w.id);
    const allRRs = (await (prisma as any).repairReport.findMany({
      select: { id: true, workOrderId: true },
    })) as Array<{ id: string; workOrderId: string | null }>;

    for (const r of allRRs) if (r.workOrderId) woToRr.set(r.workOrderId, r.id);
  } else if (active === "workorder") {
    const where = {
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
    } as any;
    totalCount = await prisma.workOrder.count({ where });
    workorders = await prisma.workOrder.findMany({
      where,
      orderBy: buildOrderBy([
        "createdAt",
        "number",
        "reporterName",
        "disturbanceLocation",
        "disturbanceType",
        "team",
      ]),
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const allRRs = (await (prisma as any).repairReport.findMany({
      select: { id: true, workOrderId: true },
    })) as Array<{ id: string; workOrderId: string | null }>;

    for (const r of allRRs) if (r.workOrderId) woToRr.set(r.workOrderId, r.id);
    // Build WO -> SR map for badges
    const allWOs = (await (prisma as any).workOrder.findMany({
      select: { id: true, serviceRequestId: true },
    })) as Array<{ id: string; serviceRequestId: string | null }>;
    for (const w of allWOs) if (w.serviceRequestId) woToSr.set(w.id, w.serviceRequestId);
    // Build WO -> Complaint map for badges
    const compForWO = (await (prisma as any).complaint.findMany({
      select: { id: true, workOrderId: true },
      where: { workOrderId: { not: null } },
    })) as Array<{ id: string; workOrderId: string | null }>;
    for (const c of compForWO) if (c.workOrderId) woToComplaint.set(c.workOrderId, c.id);
  } else {
    const where = {
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
    } as any;
    totalCount = await prisma.repairReport.count({ where });
    repairs = await prisma.repairReport.findMany({
      where,
      orderBy: buildOrderBy(["createdAt", "city", "team", "authorizedBy"]),
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    // Build WO -> SR to allow SR badge through WO
    const allWOs = (await (prisma as any).workOrder.findMany({
      select: { id: true, serviceRequestId: true },
    })) as Array<{ id: string; serviceRequestId: string | null }>;
    for (const w of allWOs) if (w.serviceRequestId) woToSr.set(w.id, w.serviceRequestId);
    // Build RR -> Complaint and WO -> Complaint maps for badges
    const compForRR = (await (prisma as any).complaint.findMany({
      select: { id: true, repairReportId: true },
      where: { repairReportId: { not: null } },
    })) as Array<{ id: string; repairReportId: string | null }>;
    for (const c of compForRR) if (c.repairReportId) rrToComplaint.set(c.repairReportId, c.id);
    const compForWO = (await (prisma as any).complaint.findMany({
      select: { id: true, workOrderId: true },
      where: { workOrderId: { not: null } },
    })) as Array<{ id: string; workOrderId: string | null }>;
    for (const c of compForWO) if (c.workOrderId) woToComplaint.set(c.workOrderId, c.id);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "Daftar Data", href: "/daftar-data" },
          { label: tabs.find((t) => t.id === active)?.label || "" },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Daftar Data</h2>
        {/* Alur kerja: pembuatan data baru dimulai dari Tab Pengaduan via tombol Aksi */}
      </div>

      <nav className="flex items-center gap-2 rounded-xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <TabLink key={t.id} id={t.id} active={active === t.id} sp={sp} />
        ))}
      </nav>

      <div className="card p-4 space-y-4">
        <div className="filter-bar">
          <FilterBar sp={sp} />
        </div>
        {active !== "complaint" &&
          (() => {
            const chips: Array<{ key: string; label: string }> = [];
            if (q) chips.push({ key: "q", label: `Kata kunci: "${q}"` });
            if (from)
              chips.push({
                key: "from",
                label: `Dari: ${new Intl.DateTimeFormat("id-ID").format(from)}`,
              });
            if (to)
              chips.push({
                key: "to",
                label: `Sampai: ${new Intl.DateTimeFormat("id-ID").format(to)}`,
              });
            if (statusFilter)
              chips.push({
                key: "status",
                label: statusFilter === "baru" ? "Status: Baru" : "Status: Sudah diproses",
              });
            if (!chips.length) return null;
            return (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {chips.map((c) => {
                  const next = new URLSearchParams(sp);
                  next.delete(c.key);
                  next.set("page", "1");
                  return (
                    <Link
                      key={c.key}
                      href={`?${next.toString()}`}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-gray-700 hover:bg-gray-200"
                      title="Hapus filter ini"
                    >
                      {c.label}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        className="h-3.5 w-3.5"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </Link>
                  );
                })}
                <Link className="ml-1 text-blue-700 hover:underline" href={`?tab=${active}`}>
                  Hapus semua filter
                </Link>
              </div>
            );
          })()}

        {active === "complaint" && (
          <div id="print-area" className="pb-2">
            <div className="mb-3">
              <div className="font-medium">{entityLabel("complaint")}</div>
              <div className="text-sm text-gray-500">
                Menampilkan {complaints.length} dari {totalCount} entri
              </div>
            </div>
            {/* Legenda status */}
            <div className="mb-3 text-xs text-gray-600">
              <div className="inline-flex flex-wrap items-center gap-3 rounded-md bg-gray-50 px-3 py-2">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block rounded-full bg-yellow-50 px-2 py-0.5 text-yellow-700">
                    Baru
                  </span>
                  <span>{entityLabel("complaint")} baru diterima</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                    {entityAbbr("serviceRequest")}
                  </span>
                  <span>{entityLabel("serviceRequest")} dibuat</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                    {entityAbbr("workOrder")}
                  </span>
                  <span>{entityLabel("workOrder")} dibuat</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block rounded-full bg-green-600 px-2 py-0.5 text-white">
                    BA
                  </span>
                  <span>{entityLabel("repairReport")} selesai</span>
                </span>
              </div>
            </div>
            <div className="rounded-lg border">
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("Tgl", "createdAt", "complaint")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("Nama", "customerName", "complaint")}
                      </th>
                      <th className="px-4 py-3 text-left">Alamat</th>
                      <th className="px-4 py-3 text-left">No. SL</th>
                      <th className="px-4 py-3 text-left">No HP</th>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("Kategori", "category", "complaint")}
                      </th>
                      <th className="px-4 py-3 text-left">Keluhan</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-gray-200 odd:bg-white even:bg-gray-50"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                        <td className="px-4 py-3 font-medium">{c.customerName}</td>
                        <td className="px-4 py-3">{c.address}</td>
                        <td className="px-4 py-3">{c.connectionNumber || "-"}</td>
                        <td className="px-4 py-3">{c.phone || "-"}</td>
                        <td className="px-4 py-3">{c.category}</td>
                        <td className="px-4 py-3 max-w-[24rem] truncate" title={c.complaintText}>
                          {c.complaintText}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            const steps: Array<{
                              key: string;
                              label: string;
                              active: boolean;
                              title?: string;
                              color: string;
                            }> = [];
                            const createdAt = c.createdAt ? new Date(c.createdAt) : undefined;
                            const processedAt = c.processedAt ? new Date(c.processedAt) : undefined;
                            const fmt = (d?: Date) =>
                              d
                                ? new Intl.DateTimeFormat("id-ID", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  }).format(d)
                                : undefined;
                            // Step 1: Baru (received)
                            steps.push({
                              key: "new",
                              label: "Baru",
                              active:
                                !c.processedAt &&
                                !c.serviceRequestId &&
                                !c.workOrderId &&
                                !c.repairReportId,
                              title: fmt(createdAt) ? `Diterima: ${fmt(createdAt)}` : undefined,
                              color: "yellow",
                            });
                            // Step 2: Permintaan Service dibuat
                            steps.push({
                              key: "sr",
                              label: entityLabel("serviceRequest"),
                              active: !!c.serviceRequestId && !c.workOrderId && !c.repairReportId,
                              title: c.serviceRequestId
                                ? `${entityLabel("serviceRequest")}: ${c.serviceRequestId}`
                                : undefined,
                              color: "indigo",
                            });
                            // Step 3: Surat Perintah Kerja dibuat
                            steps.push({
                              key: "wo",
                              label: entityLabel("workOrder"),
                              active: !!c.workOrderId && !c.repairReportId,
                              title: c.workOrderId
                                ? `${entityLabel("workOrder")}: ${c.workOrderId}`
                                : undefined,
                              color: "blue",
                            });
                            // Step 4: BA Perbaikan selesai
                            steps.push({
                              key: "rr",
                              label: "Selesai",
                              active: !!c.repairReportId,
                              title: c.repairReportId
                                ? `${entityLabel("repairReport")}: ${c.repairReportId}`
                                : undefined,
                              color: "green",
                            });

                            // Render compact chips showing the farthest achieved stage & breadcrumbs
                            const achieved = c.repairReportId
                              ? "rr"
                              : c.workOrderId
                                ? "wo"
                                : c.serviceRequestId
                                  ? "sr"
                                  : "new";

                            const Chip = ({
                              label,
                              color,
                              title,
                              solid,
                            }: {
                              label: string;
                              color: string;
                              title?: string;
                              solid?: boolean;
                            }) => (
                              <span
                                title={title}
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                                  color === "green"
                                    ? solid
                                      ? "bg-green-600 text-white"
                                      : "bg-green-50 text-green-700"
                                    : color === "blue"
                                      ? solid
                                        ? "bg-blue-600 text-white"
                                        : "bg-blue-50 text-blue-700"
                                      : color === "indigo"
                                        ? solid
                                          ? "bg-indigo-600 text-white"
                                          : "bg-indigo-50 text-indigo-700"
                                        : "bg-yellow-50 text-yellow-700"
                                }`}
                              >
                                {label}
                              </span>
                            );

                            return (
                              <span className="inline-flex items-center gap-1">
                                {achieved === "new" && (
                                  <Chip
                                    label="Baru"
                                    color="yellow"
                                    title={
                                      fmt(createdAt) ? `Diterima: ${fmt(createdAt)}` : undefined
                                    }
                                    solid
                                  />
                                )}
                                {achieved === "sr" && (
                                  <>
                                    <Chip
                                      label={
                                        entityAbbr("serviceRequest") ||
                                        entityLabel("serviceRequest")
                                      }
                                      color="indigo"
                                      title={`Terhubung ${entityLabel("serviceRequest")}`}
                                      solid
                                    />
                                  </>
                                )}
                                {achieved === "wo" && (
                                  <>
                                    <Chip
                                      label={
                                        entityAbbr("serviceRequest") ||
                                        entityLabel("serviceRequest")
                                      }
                                      color="indigo"
                                      title={`Terhubung ${entityLabel("serviceRequest")}`}
                                    />
                                    <Chip
                                      label={entityAbbr("workOrder") || entityLabel("workOrder")}
                                      color="blue"
                                      title={`Terhubung ${entityLabel("workOrder")}`}
                                      solid
                                    />
                                  </>
                                )}
                                {achieved === "rr" && (
                                  <>
                                    <Chip
                                      label={
                                        entityAbbr("serviceRequest") ||
                                        entityLabel("serviceRequest")
                                      }
                                      color="indigo"
                                      title={`Terhubung ${entityLabel("serviceRequest")}`}
                                    />
                                    <Chip
                                      label={entityAbbr("workOrder") || entityLabel("workOrder")}
                                      color="blue"
                                      title={`Terhubung ${entityLabel("workOrder")}`}
                                    />
                                    <Chip
                                      label={entityAbbr("repairReport") || "Selesai"}
                                      color="green"
                                      title={entityLabel("repairReport")}
                                      solid
                                    />
                                  </>
                                )}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            let href: string | null = null;
                            if (c.serviceRequestId) {
                              href = `/daftar-data/service/${c.serviceRequestId}`;
                            } else {
                              // Hanya HUMAS dapat memulai SR dari pengaduan
                              if (role === "humas") {
                                href = `/?flow=service&complaintId=${encodeURIComponent(
                                  c.id,
                                )}&customerName=${encodeURIComponent(
                                  c.customerName,
                                )}&address=${encodeURIComponent(
                                  c.address,
                                )}&phone=${encodeURIComponent(
                                  c.phone || "",
                                )}&connectionNumber=${encodeURIComponent(
                                  c.connectionNumber || "",
                                )}&category=${encodeURIComponent(c.category)}`;
                              }
                            }
                            return (
                              <div className="flex items-center gap-2">
                                {href ? (
                                  <Link className="btn-outline btn-sm" href={href}>
                                    Aksi
                                  </Link>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                                <Link
                                  className="btn-outline btn-sm"
                                  href={`/daftar-data/complaint/${c.id}?print=1`}
                                  title="Cetak PDF"
                                >
                                  Cetak
                                </Link>
                                {c.mapsLink ? (
                                  <a
                                    className="text-gray-700 hover:underline"
                                    href={c.mapsLink}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Maps
                                  </a>
                                ) : null}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                    {complaints.length === 0 && (
                      <tr>
                        <td className="px-3 py-10 text-center text-gray-500" colSpan={9}>
                          <div className="flex flex-col items-center gap-3">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                              className="h-10 w-10 text-gray-300"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 7h18M3 12h12M3 17h8"
                              />
                            </svg>
                            <div>Tidak ada data. Coba ubah filter atau reset.</div>
                            <div className="flex items-center gap-2">
                              <Link className="btn-outline btn-sm" href={`?tab=complaint`}>
                                Reset
                              </Link>
                              <Link
                                className="btn-outline btn-sm"
                                href={`?tab=complaint`}
                                title="Mulai proses dari daftar pengaduan"
                              >
                                Mulai dari Pengaduan
                              </Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="pagination flex items-center justify-between pt-3 text-sm text-gray-600">
              <div>
                Hal. {page} / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const prevSp = new URLSearchParams(sp);
                  prevSp.set("tab", "complaint");
                  prevSp.set("page", String(Math.max(1, page - 1)));
                  prevSp.set("pageSize", String(pageSize));
                  const nextSp = new URLSearchParams(sp);
                  nextSp.set("tab", "complaint");
                  nextSp.set("page", String(Math.min(totalPages, page + 1)));
                  nextSp.set("pageSize", String(pageSize));
                  const base = "inline-flex items-center rounded-md px-3 py-1.5 border text-sm";
                  const prevDisabled = page <= 1;
                  const nextDisabled = page >= totalPages;
                  return (
                    <>
                      <Link
                        className={`btn-outline btn-sm ${prevDisabled ? "pointer-events-none opacity-50" : ""}`}
                        href={`?${prevSp.toString()}`}
                      >
                        Sebelumnya
                      </Link>
                      <Link
                        className={`btn-outline btn-sm ${nextDisabled ? "pointer-events-none opacity-50" : ""}`}
                        href={`?${nextSp.toString()}`}
                      >
                        Berikutnya
                      </Link>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {active === "service" && (
          <div id="print-area" className="pb-2">
            <div className="mb-3">
              <div className="font-medium">{entityLabel("serviceRequest")}</div>
              <div className="text-sm text-gray-500">
                Menampilkan {services.length} dari {totalCount} entri
              </div>
            </div>
            <div className="rounded-lg border">
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("Tgl Permintaan", "requestDate", "service")}
                      </th>
                      <th className="px-4 py-3 text-left min-w-[12rem]">
                        {headerSortLink("Nama Pelapor", "reporterName", "service")}
                      </th>
                      <th className="px-4 py-3 text-left min-w-[14rem]">
                        {headerSortLink("Alamat", "address", "service")}
                      </th>
                      <th className="px-4 py-3 text-left w-28">
                        {headerSortLink("Urgensi", "urgency", "service")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("Petugas", "handlerName", "service")}
                      </th>
                      <th className="px-4 py-3 text-left">Alasan/ Tindakan</th>
                      <th className="px-4 py-3 text-left">Relasi</th>
                      <th className="px-4 py-3 text-left">Aksi</th>
                      <th className="px-4 py-3 text-left">Lihat Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-gray-200 odd:bg-white even:bg-gray-50"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatDate((s as any).requestDate ?? s.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium min-w-[12rem]">
                          {(s as any).reporterName ?? s.customerName}
                        </td>
                        <td className="px-4 py-3 align-top min-w-[14rem]">{s.address}</td>
                        <td className="px-4 py-3 font-medium w-28">
                          {(() => {
                            const u = ((s as any).urgency as string | undefined) ?? undefined;
                            if (!u) return "-";
                            const cls =
                              u === "HIGH"
                                ? "bg-red-50 text-red-700"
                                : u === "MEDIUM"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-green-50 text-green-700"; // LOW
                            return (
                              <span
                                className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}
                              >
                                {u}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">{s.handlerName ?? s.receivedBy ?? "-"}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-gray-700">{joinJsonArray(s.reasons)}</div>
                          <div className="text-gray-500">{s.actionTaken ?? "-"}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            const woId = srToWo.get(s.id);
                            const hasRr = woId ? woToRr.has(woId) : false; // Check if repair report exists
                            if (!woId) return <span className="text-gray-400">-</span>;
                            return (
                              <span className="inline-flex items-center gap-1">
                                <span className="relative group">
                                  <Link
                                    className="rounded bg-blue-50 px-2 py-0.5 text-blue-700 hover:underline"
                                    href={`/daftar-data/workorder/${woId}`}
                                    title={`Lihat ${entityLabel("workOrder")}`}
                                    aria-label={`Lihat ${entityLabel("workOrder")}`}
                                  >
                                    {entityLabel("workOrder")}
                                  </Link>
                                  <span
                                    role="tooltip"
                                    className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                                  >
                                    {`Lihat ${entityLabel("workOrder")}`}
                                  </span>
                                </span>
                                {hasRr
                                  ? (() => {
                                      const rrId = woToRr.get(woId!);
                                      return rrId ? (
                                        <span className="relative group">
                                          <Link
                                            className="rounded bg-green-50 px-2 py-0.5 text-green-700 hover:underline"
                                            href={`/daftar-data/repair/${rrId}`}
                                            title={`Lihat ${entityLabel("repairReport")}`}
                                            aria-label={`Lihat ${entityLabel("repairReport")}`}
                                          >
                                            {entityLabel("repairReport")}
                                          </Link>
                                          <span
                                            role="tooltip"
                                            className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                                          >
                                            {`Lihat ${entityLabel("repairReport")}`}
                                          </span>
                                        </span>
                                      ) : null;
                                    })()
                                  : null}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            const woId = srToWo.get(s.id);
                            if (!woId) {
                              // Hanya DISTRIBUSI dapat membuat WO dari SR
                              if (role === "distribusi") {
                                const href = `/?flow=workorder&serviceRequestId=${encodeURIComponent(
                                  s.id,
                                )}`;
                                return (
                                  <Link className="btn-outline btn-sm" href={href}>
                                    Aksi
                                  </Link>
                                );
                              }
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">-</span>
                                  <Link
                                    className="btn-outline btn-sm"
                                    href={`/daftar-data/service/${s.id}?print=1`}
                                    title="Cetak PDF"
                                  >
                                    Cetak
                                  </Link>
                                </div>
                              );
                            }
                            const hasRr = woToRr.has(woId);
                            if (!hasRr) {
                              // Hanya DISTRIBUSI dapat membuat Berita Acara
                              if (role === "distribusi") {
                                const href = `/?flow=repair&workOrderId=${encodeURIComponent(woId)}`;
                                return (
                                  <Link
                                    className="inline-flex items-center rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-gray-700 hover:bg-gray-200"
                                    href={href}
                                  >
                                    Aksi
                                  </Link>
                                );
                              }
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">-</span>
                                  <Link
                                    className="btn-outline btn-sm"
                                    href={`/daftar-data/service/${s.id}?print=1`}
                                    title="Cetak PDF"
                                  >
                                    Cetak
                                  </Link>
                                </div>
                              );
                            }
                            return (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">-</span>
                                <Link
                                  className="btn-outline btn-sm"
                                  href={`/daftar-data/service/${s.id}?print=1`}
                                  title="Cetak PDF"
                                >
                                  Cetak
                                </Link>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            className="btn-outline btn-sm inline-flex items-center gap-1"
                            href={`/daftar-data/service/${s.id}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                              className="h-4 w-4"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 19.5L8.25 12l7.5-7.5"
                              />
                            </svg>
                            Lihat Detail
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {services.length === 0 && (
                      <tr>
                        <td className="px-3 py-10 text-center text-gray-500" colSpan={9}>
                          <div className="flex flex-col items-center gap-3">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                              className="h-10 w-10 text-gray-300"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 7h18M3 12h12M3 17h8"
                              />
                            </svg>
                            <div>Belum ada {entityLabel("serviceRequest")}.</div>
                            <div className="flex items-center gap-2">
                              <Link className="btn-outline btn-sm" href={`?tab=service`}>
                                Reset
                              </Link>
                              <Link
                                className="btn-outline btn-sm"
                                href={`?tab=complaint`}
                                title="Mulai proses dari daftar pengaduan"
                              >
                                Mulai dari Pengaduan
                              </Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="pagination flex items-center justify-between pt-3 text-sm text-gray-600">
              <div>
                Hal. {page} / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const prev = new URLSearchParams(sp);
                  prev.set("tab", "service");
                  prev.set("page", String(Math.max(1, page - 1)));
                  prev.set("pageSize", String(pageSize));
                  const next = new URLSearchParams(sp);
                  next.set("tab", "service");
                  next.set("page", String(Math.min(totalPages, page + 1)));
                  next.set("pageSize", String(pageSize));
                  const base = "inline-flex items-center rounded-md px-3 py-1.5 border text-sm";
                  const prevDisabled = page <= 1;
                  const nextDisabled = page >= totalPages;
                  return (
                    <>
                      <Link
                        className={`btn-outline btn-sm ${prevDisabled ? "pointer-events-none opacity-50" : ""}`}
                        href={`?${prev.toString()}`}
                      >
                        Sebelumnya
                      </Link>
                      <Link
                        className={`btn-outline btn-sm ${nextDisabled ? "pointer-events-none opacity-50" : ""}`}
                        href={`?${next.toString()}`}
                      >
                        Berikutnya
                      </Link>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {active === "workorder" && (
          <div id="print-area" className="pb-2">
            <div className="mb-3">
              <div className="text-sm text-gray-500">
                Menampilkan {workorders.length} dari {totalCount} entri
              </div>
            </div>
            <div className="rounded-lg border">
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("Tgl Input", "createdAt", "workorder")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("No", "number", "workorder")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("Pelapor", "reporterName", "workorder")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("Lokasi Gangguan", "disturbanceLocation", "workorder")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("Jenis Gangguan", "disturbanceType", "workorder")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("Tim/Pelaksana", "team", "workorder")}
                      </th>
                      <th className="px-4 py-3 text-left">Relasi</th>
                      <th className="px-4 py-3 text-left">Aksi</th>
                      <th className="px-4 py-3 text-left">Lihat Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workorders.map((w) => (
                      <tr
                        key={w.id}
                        className="border-b border-gray-200 odd:bg-white even:bg-gray-50"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(w.createdAt)}</td>
                        <td className="px-4 py-3 font-medium">{w.number ?? "-"}</td>
                        <td className="px-4 py-3 font-medium">{w.reporterName ?? "-"}</td>
                        <td className="px-4 py-3 align-top">{w.disturbanceLocation ?? "-"}</td>
                        <td className="px-4 py-3 align-top">{w.disturbanceType ?? "-"}</td>
                        <td className="px-4 py-3">{w.team ?? w.executorName ?? "-"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            const hasSr = !!woToSr.get(w.id) || !!w.serviceRequestId;
                            const hasRr = woToRr.has(w.id);
                            const hasComplaint = woToComplaint.has(w.id);
                            if (!hasSr && !hasRr) return <span className="text-gray-400">-</span>;
                            return (
                              <span className="inline-flex items-center gap-1">
                                {hasComplaint
                                  ? (() => {
                                      const cid = woToComplaint.get(w.id);
                                      if (!cid) return null;
                                      return (
                                        <Link
                                          className="rounded bg-rose-50 px-2 py-0.5 text-rose-700 hover:underline"
                                          href={`/daftar-data/complaint/${cid}`}
                                          title={`ID ${entityLabel("complaint")}: ${cid}`}
                                        >
                                          {entityLabel("complaint")}
                                        </Link>
                                      );
                                    })()
                                  : null}
                                {hasSr
                                  ? (() => {
                                      const srId = woToSr.get(w.id) || w.serviceRequestId;
                                      return srId ? (
                                        <Link
                                          className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700 hover:underline"
                                          href={`/daftar-data/service/${srId}`}
                                          title={`Lihat ${entityLabel("serviceRequest")}`}
                                          aria-label={`Lihat ${entityLabel("serviceRequest")}`}
                                        >
                                          {entityLabel("serviceRequest")}
                                        </Link>
                                      ) : null;
                                    })()
                                  : null}
                                {hasRr ? (
                                  <Link
                                    className="rounded bg-green-50 px-2 py-0.5 text-green-700 hover:underline"
                                    href={`/daftar-data/repair/${woToRr.get(w.id)}`}
                                    title={`Lihat ${entityLabel("repairReport")}`}
                                    aria-label={`Lihat ${entityLabel("repairReport")}`}
                                  >
                                    {entityLabel("repairReport")}
                                  </Link>
                                ) : null}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            const hasRr = woToRr.has(w.id);
                            if (!hasRr) {
                              if (role === "distribusi") {
                                const href = `/?flow=repair&workOrderId=${encodeURIComponent(w.id)}`;
                                return (
                                  <Link className="btn-outline btn-sm" href={href}>
                                    Aksi
                                  </Link>
                                );
                              }
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">-</span>
                                  <Link
                                    className="btn-outline btn-sm"
                                    href={`/daftar-data/workorder/${w.id}?print=1`}
                                    title="Cetak PDF"
                                  >
                                    Cetak
                                  </Link>
                                </div>
                              );
                            }
                            return (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">-</span>
                                <Link
                                  className="btn-outline btn-sm"
                                  href={`/daftar-data/workorder/${w.id}?print=1`}
                                  title="Cetak PDF"
                                >
                                  Cetak
                                </Link>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            className="btn-outline btn-sm inline-flex items-center gap-1"
                            href={`/daftar-data/workorder/${w.id}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                              className="h-4 w-4"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 19.5L8.25 12l7.5-7.5"
                              />
                            </svg>
                            Lihat Detail
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {workorders.length === 0 && (
                      <tr>
                        <td className="px-3 py-10 text-center text-gray-500" colSpan={9}>
                          <div className="flex flex-col items-center gap-3">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                              className="h-10 w-10 text-gray-300"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 7h18M3 12h12M3 17h8"
                              />
                            </svg>
                            <div>Belum ada {entityLabel("workOrder")}.</div>
                            <div className="flex items-center gap-2">
                              <Link className="btn-outline btn-sm" href={`?tab=workorder`}>
                                Reset
                              </Link>
                              <Link
                                className="btn-outline btn-sm"
                                href={`?tab=complaint`}
                                title="Mulai proses dari daftar pengaduan"
                              >
                                Mulai dari Pengaduan
                              </Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="pagination flex items-center justify-between pt-3 text-sm text-gray-600">
              <div>
                Hal. {page} / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const prev = new URLSearchParams(sp);
                  prev.set("tab", "workorder");
                  prev.set("page", String(Math.max(1, page - 1)));
                  prev.set("pageSize", String(pageSize));
                  const next = new URLSearchParams(sp);
                  next.set("tab", "workorder");
                  next.set("page", String(Math.min(totalPages, page + 1)));
                  next.set("pageSize", String(pageSize));
                  const base = "inline-flex items-center rounded-md px-3 py-1.5 border text-sm";
                  const prevDisabled = page <= 1;
                  const nextDisabled = page >= totalPages;
                  return (
                    <>
                      <Link
                        className={`btn-outline btn-sm ${prevDisabled ? "pointer-events-none opacity-50" : ""}`}
                        href={`?${prev.toString()}`}
                      >
                        Sebelumnya
                      </Link>
                      <Link
                        className={`btn-outline btn-sm ${nextDisabled ? "pointer-events-none opacity-50" : ""}`}
                        href={`?${next.toString()}`}
                      >
                        Berikutnya
                      </Link>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {active === "repair" && (
          <div id="print-area" className="pb-2">
            <div className="mb-3">
              <div className="text-sm text-gray-500">
                Menampilkan {repairs.length} dari {totalCount} entri
              </div>
            </div>
            <div className="rounded-lg border">
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("Tgl Input", "createdAt", "repair")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("Kota", "city", "repair")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("Tim/Pelaksana", "team", "repair")}
                      </th>
                      <th className="px-4 py-3 text-left">Tindakan</th>
                      <th className="px-4 py-3 text-left">Tidak Ditangani</th>
                      <th className="px-4 py-3 text-left">
                        {headerSortLink("Disahkan Oleh", "authorizedBy", "repair")}
                      </th>
                      <th className="px-4 py-3 text-left">Relasi</th>
                      <th className="px-4 py-3 text-left">Lihat Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repairs.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-gray-200 odd:bg-white even:bg-gray-50"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                        <td className="px-4 py-3">{r.city ?? "-"}</td>
                        <td className="px-4 py-3 font-medium">{r.team ?? r.executorName ?? "-"}</td>
                        <td className="px-4 py-3 align-top">{joinJsonArray(r.actions)}</td>
                        <td className="px-4 py-3 align-top">
                          {joinJsonArray(r.notHandledReasons)}
                        </td>
                        <td className="px-4 py-3">{r.authorizedBy ?? "-"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            const woId = r.workOrderId as string | undefined;
                            const hasWo = !!woId;
                            const hasSr = woId ? woToSr.has(woId) : false;
                            const hasComplaint =
                              rrToComplaint.has(r.id) || (woId ? woToComplaint.has(woId) : false);
                            if (!hasWo && !hasSr) return <span className="text-gray-400">-</span>;
                            return (
                              <span className="inline-flex items-center gap-1">
                                {hasComplaint
                                  ? (() => {
                                      const cid =
                                        rrToComplaint.get(r.id) ||
                                        (woId ? woToComplaint.get(woId) : undefined);
                                      if (!cid) return null;
                                      return (
                                        <Link
                                          className="rounded bg-rose-50 px-2 py-0.5 text-rose-700 hover:underline"
                                          href={`/daftar-data/complaint/${cid}`}
                                          title={`ID ${entityLabel("complaint")}: ${cid}`}
                                        >
                                          {entityLabel("complaint")}
                                        </Link>
                                      );
                                    })()
                                  : null}
                                {hasWo ? (
                                  <Link
                                    className="rounded bg-blue-50 px-2 py-0.5 text-blue-700 hover:underline"
                                    href={`/daftar-data/workorder/${woId}`}
                                    title={`Lihat ${entityLabel("workOrder")}`}
                                  >
                                    {entityLabel("workOrder")}
                                  </Link>
                                ) : null}
                                {hasSr ? (
                                  <Link
                                    className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700 hover:underline"
                                    href={`/daftar-data/service/${woToSr.get(woId!)}`}
                                    title={`Lihat ${entityLabel("serviceRequest")}`}
                                  >
                                    {entityLabel("serviceRequest")}
                                  </Link>
                                ) : null}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            className="btn-outline btn-sm inline-flex items-center gap-1"
                            href={`/daftar-data/repair/${r.id}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                              className="h-4 w-4"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 19.5L8.25 12l7.5-7.5"
                              />
                            </svg>
                            Lihat Detail
                          </Link>
                          <Link
                            className="btn-outline btn-sm ml-2"
                            href={`/daftar-data/repair/${r.id}?print=1`}
                            title="Cetak PDF"
                          >
                            Cetak
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {repairs.length === 0 && (
                      <tr>
                        <td className="px-3 py-10 text-center text-gray-500" colSpan={8}>
                          <div className="flex flex-col items-center gap-3">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                              className="h-10 w-10 text-gray-300"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 7h18M3 12h12M3 17h8"
                              />
                            </svg>
                            <div>Belum ada {entityLabel("repairReport")}.</div>
                            <div className="flex items-center gap-2">
                              <Link
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                href={`?tab=repair`}
                              >
                                Reset
                              </Link>
                              <Link
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                href={`?tab=complaint`}
                                title="Mulai proses dari daftar pengaduan"
                              >
                                Mulai dari Pengaduan
                              </Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="pagination flex items-center justify-between pt-3 text-sm text-gray-600">
              <div>
                Hal. {page} / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const prev = new URLSearchParams(sp);
                  prev.set("tab", "repair");
                  prev.set("page", String(Math.max(1, page - 1)));
                  prev.set("pageSize", String(pageSize));
                  const next = new URLSearchParams(sp);
                  next.set("tab", "repair");
                  next.set("page", String(Math.min(totalPages, page + 1)));
                  next.set("pageSize", String(pageSize));
                  const base = "inline-flex items-center rounded-md px-3 py-1.5 border text-sm";
                  const prevDisabled = page <= 1;
                  const nextDisabled = page >= totalPages;
                  return (
                    <>
                      <Link
                        className={`${base} ${
                          prevDisabled
                            ? "pointer-events-none bg-gray-100 text-gray-400 border-gray-200"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                        href={`?${prev.toString()}`}
                      >
                        Sebelumnya
                      </Link>
                      <Link
                        className={`${base} ${
                          nextDisabled
                            ? "pointer-events-none bg-gray-100 text-gray-400 border-gray-200"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                        href={`?${next.toString()}`}
                      >
                        Berikutnya
                      </Link>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
