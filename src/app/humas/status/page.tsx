import Link from "next/link";
import { getServerSession } from "next-auth";

import Breadcrumbs from "@/components/Breadcrumbs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildWhereClause,
  buildComplaintStatusFilter,
  parseDateParams,
  SEARCH_FIELDS,
} from "@/lib/queryBuilder";
import { entityAbbr, entityLabel } from "@/lib/uiLabels";

export const dynamic = "force-dynamic";

function formatDate(d?: Date | string | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(dt);
  } catch {
    return "-";
  }
}

type PageProps = { searchParams?: Record<string, string | string[] | undefined> };

function getParam(sp: PageProps["searchParams"], key: string) {
  const v = sp?.[key];
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

export default async function HumasStatusPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!(role === "humas")) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Status HUMAS</h2>
        <p>Akses ditolak.</p>
      </div>
    );
  }

  // Parse filters
  const q = (getParam(searchParams, "q") ?? "").trim();
  const fromStr = getParam(searchParams, "from");
  const toStr = getParam(searchParams, "to");
  const status = (getParam(searchParams, "status") ?? "").trim(); // "baru" | "proses" | "selesai" | ""

  const { from, to } = parseDateParams(
    new URLSearchParams(
      Object.entries(searchParams || {})
        .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
        .filter(([, v]) => v != null) as string[][],
    ),
  );

  // Build where clauses using utility functions
  const complaintWhere = buildWhereClause({
    dateRange: { from, to },
    searchTerm: q,
    searchFields: SEARCH_FIELDS.complaint,
    additionalConditions: (() => {
      if (status === "proses") {
        return {
          AND: [
            {
              OR: [{ serviceRequestId: { not: null } }, { workOrderId: { not: null } }],
            },
            { repairReportId: null },
          ],
        };
      }
      return buildComplaintStatusFilter(status);
    })(),
  });

  const serviceWhere = buildWhereClause({
    dateRange: { from, to },
    searchTerm: q,
    searchFields: SEARCH_FIELDS.serviceRequest,
  });

  // Base where for KPI counters (same filter by date/q, without narrowing by selected status)
  const complaintWhereBase = buildWhereClause({
    dateRange: { from, to },
    searchTerm: q,
    searchFields: SEARCH_FIELDS.complaint,
  });

  // Pagination params (complaints & services lists)
  const cSizeParam = parseInt(getParam(searchParams, "cSize") || "10", 10);
  const cSize = Number.isFinite(cSizeParam) && cSizeParam > 0 ? Math.min(cSizeParam, 100) : 10;
  const cPageParam = parseInt(getParam(searchParams, "cPage") || "1", 10);
  const cPage = Number.isFinite(cPageParam) && cPageParam > 0 ? cPageParam : 1;

  const sSizeParam = parseInt(getParam(searchParams, "sSize") || "10", 10);
  const sSize = Number.isFinite(sSizeParam) && sSizeParam > 0 ? Math.min(sSizeParam, 100) : 10;
  const sPageParam = parseInt(getParam(searchParams, "sPage") || "1", 10);
  const sPage = Number.isFinite(sPageParam) && sPageParam > 0 ? sPageParam : 1;

  // Totals for pagination and KPI
  const [cTotal, sTotal, baruCount, prosesCount, selesaiCount, totalCount] = await Promise.all([
    prisma.complaint.count({ where: complaintWhere }),
    prisma.serviceRequest.count({ where: serviceWhere }),
    prisma.complaint.count({
      where: {
        ...complaintWhereBase,
        ...buildComplaintStatusFilter("baru"),
      },
    }),
    prisma.complaint.count({
      where: {
        ...complaintWhereBase,
        AND: [
          { repairReportId: null },
          { OR: [{ serviceRequestId: { not: null } }, { workOrderId: { not: null } }] },
        ],
      },
    }),
    prisma.complaint.count({
      where: {
        ...complaintWhereBase,
        ...buildComplaintStatusFilter("selesai"),
      },
    }),
    prisma.complaint.count({ where: complaintWhereBase }),
  ]);

  const complaints = await prisma.complaint.findMany({
    where: complaintWhere,
    orderBy: { createdAt: "desc" },
    skip: (cPage - 1) * cSize,
    take: cSize,
  });
  const services = await prisma.serviceRequest.findMany({
    where: serviceWhere,
    orderBy: { createdAt: "desc" },
    skip: (sPage - 1) * sSize,
    take: sSize,
    // ✅ FIX N+1: Include related WorkOrder and RepairReport in single query
    include: {
      workOrder: {
        select: {
          id: true,
          repairReport: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  // Build relation maps for Service -> WO -> RR to show processing badge
  // ✅ FIX N+1: Use included data instead of separate queries
  let srToWo = new Map<string, string>();
  let woHasRr = new Set<string>();

  for (const service of services) {
    if (service.workOrder) {
      const workOrder = service.workOrder;
      srToWo.set(service.id, workOrder.id);

      if (workOrder.repairReport) {
        woHasRr.add(workOrder.id);
      }
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "HUMAS", href: "/humas" },
          { label: "Status" },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Status HUMAS</h2>
        <Link className="btn-outline btn-sm" href="/humas/daftar-data?tab=service">
          Lihat Daftar Data
        </Link>
      </div>

      {/* KPI counters */}
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="card p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-blue-700">Baru</div>
            <div className="p-2 bg-blue-500 rounded-lg">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-5 5v-5zM21 5H3a2 2 0 00-2 2v10a2 2 0 002 2h5l5-5V7a2 2 0 00-2-2z"
                />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-900">{baruCount}</div>
          <div className="text-xs text-blue-600 mt-1">Pengaduan masuk</div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-amber-700">Proses</div>
            <div className="p-2 bg-amber-500 rounded-lg">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-900">{prosesCount}</div>
          <div className="text-xs text-amber-600 mt-1">Sedang dikerjakan</div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-green-700">Selesai</div>
            <div className="p-2 bg-green-500 rounded-lg">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-green-900">{selesaiCount}</div>
          <div className="text-xs text-green-600 mt-1">Telah tuntas</div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-gray-700">Total</div>
            <div className="p-2 bg-gray-500 rounded-lg">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
          <div className="text-xs text-gray-600 mt-1">Keseluruhan data</div>
        </div>
      </div>

      {/* Filter bar */}
      <form method="get" className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Kata kunci</label>
          <input
            name="q"
            defaultValue={q}
            className="input"
            placeholder="Cari nama, alamat, kategori..."
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Dari tanggal</label>
          <input type="date" name="from" defaultValue={fromStr || ""} className="input" />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Sampai tanggal</label>
          <input type="date" name="to" defaultValue={toStr || ""} className="input" />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Status Pengaduan</label>
          <select name="status" defaultValue={status} className="input">
            <option value="">Semua</option>
            <option value="baru">Baru</option>
            <option value="proses">Sedang diproses</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Pengaduan per halaman</label>
          <select name="cSize" defaultValue={String(cSize)} className="input">
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Service per halaman</label>
          <select name="sSize" defaultValue={String(sSize)} className="input">
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        {/* Preset tanggal */}
        {(() => {
          const today = new Date();
          const toIso = today.toISOString().slice(0, 10);
          const startOfWeek = new Date(today);
          const dw = startOfWeek.getDay();
          const diffToMonday = dw === 0 ? -6 : 1 - dw;
          startOfWeek.setDate(today.getDate() + diffToMonday);
          const fromWeekIso = startOfWeek.toISOString().slice(0, 10);
          const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const fromMonthIso = firstOfMonth.toISOString().slice(0, 10);
          const withRange = (fromV: string, toV: string) => {
            const sp = new URLSearchParams();
            for (const [k, v] of Object.entries(searchParams ?? {}))
              if (v != null) sp.set(k, Array.isArray(v) ? v[0]! : v);
            sp.set("from", fromV);
            sp.set("to", toV);
            sp.set("cPage", "1");
            sp.set("sPage", "1");
            return `?${sp.toString()}`;
          };
          return (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Preset</span>
              <div className="flex items-center gap-2">
                <Link
                  className="text-blue-700 hover:underline text-sm"
                  href={withRange(toIso, toIso)}
                >
                  Hari ini
                </Link>
                <Link
                  className="text-blue-700 hover:underline text-sm"
                  href={withRange(fromWeekIso, toIso)}
                >
                  Minggu ini
                </Link>
                <Link
                  className="text-blue-700 hover:underline text-sm"
                  href={withRange(fromMonthIso, toIso)}
                >
                  Bulan ini
                </Link>
              </div>
            </div>
          );
        })()}
        <div className="flex gap-2">
          <button type="submit" className="btn btn-sm">
            Terapkan
          </button>
          <Link className="btn-outline btn-sm" href="/humas/status">
            Reset
          </Link>
        </div>
      </form>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Pengaduan Terbaru</h3>
            <Link
              className="text-blue-700 hover:underline text-sm"
              href="/humas/daftar-data?tab=complaint"
            >
              Lihat semua
            </Link>
          </div>
          <ul className="divide-y">
            {complaints.map((c) => {
              const achieved = c.repairReportId
                ? "rr"
                : c.workOrderId
                  ? "wo"
                  : c.serviceRequestId
                    ? "sr"
                    : "new";
              return (
                <li key={c.id} className="py-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.customerName}</div>
                      <div className="text-xs text-gray-600 truncate">{c.address}</div>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {formatDate(c.createdAt)}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    {achieved === "new" && (
                      <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-yellow-700">
                        Baru
                      </span>
                    )}
                    {(achieved === "sr" || achieved === "wo" || achieved === "rr") && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                        {entityAbbr("serviceRequest")}
                      </span>
                    )}
                    {(achieved === "wo" || achieved === "rr") && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                        {entityAbbr("workOrder")}
                      </span>
                    )}
                    {achieved === "rr" && (
                      <span className="rounded-full bg-green-600 px-2 py-0.5 text-white">
                        Selesai
                      </span>
                    )}
                    {achieved !== "new" && achieved !== "rr" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                        Sedang diproses
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
            {complaints.length === 0 && (
              <li className="py-6 text-center text-gray-500">Belum ada pengaduan.</li>
            )}
          </ul>
          {/* Pagination for complaints */}
          {(() => {
            const totalPages = Math.max(1, Math.ceil(cTotal / cSize));
            const prev = new URLSearchParams();
            for (const [k, v] of Object.entries(searchParams ?? {}))
              if (v != null) prev.set(k, Array.isArray(v) ? v[0]! : v);
            prev.set("cPage", String(Math.max(1, cPage - 1)));
            prev.set("cSize", String(cSize));
            const next = new URLSearchParams(prev);
            next.set("cPage", String(Math.min(totalPages, cPage + 1)));
            return (
              <div className="pt-3 flex items-center justify-between text-sm text-gray-600">
                <div>
                  Hal. {cPage} / {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    className={`btn-outline btn-sm ${cPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
                    href={`?${prev.toString()}`}
                  >
                    Sebelumnya
                  </Link>
                  <Link
                    className={`btn-outline btn-sm ${cPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
                    href={`?${next.toString()}`}
                  >
                    Berikutnya
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">{entityLabel("serviceRequest")} Terakhir</h3>
            <Link
              className="text-blue-700 hover:underline text-sm"
              href="/humas/daftar-data?tab=service"
            >
              Lihat semua
            </Link>
          </div>
          <ul className="divide-y">
            {services.map((s) => {
              const woId = srToWo.get(s.id);
              const inProcess = !!woId && !woHasRr.has(woId);
              return (
                <li key={s.id} className="py-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.customerName}</div>
                    <div className="text-xs text-gray-600 truncate">{s.address}</div>
                    {inProcess && (
                      <div className="mt-1 text-xs">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                          Sedang diproses
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(s.createdAt)}
                    </span>
                    <Link
                      className="btn-outline btn-sm"
                      href={`/daftar-data/service/${s.id}?scope=humas`}
                    >
                      Detail
                    </Link>
                  </div>
                </li>
              );
            })}
            {services.length === 0 && (
              <li className="py-6 text-center text-gray-500">Belum ada data.</li>
            )}
          </ul>
          {/* Pagination for services */}
          {(() => {
            const totalPages = Math.max(1, Math.ceil(sTotal / sSize));
            const prev = new URLSearchParams();
            for (const [k, v] of Object.entries(searchParams ?? {}))
              if (v != null) prev.set(k, Array.isArray(v) ? v[0]! : v);
            prev.set("sPage", String(Math.max(1, sPage - 1)));
            prev.set("sSize", String(sSize));
            const next = new URLSearchParams(prev);
            next.set("sPage", String(Math.min(totalPages, sPage + 1)));
            return (
              <div className="pt-3 flex items-center justify-between text-sm text-gray-600">
                <div>
                  Hal. {sPage} / {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    className={`btn-outline btn-sm ${sPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
                    href={`?${prev.toString()}`}
                  >
                    Sebelumnya
                  </Link>
                  <Link
                    className={`btn-outline btn-sm ${sPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
                    href={`?${next.toString()}`}
                  >
                    Berikutnya
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
