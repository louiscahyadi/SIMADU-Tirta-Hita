import Link from "next/link";
import { getServerSession } from "next-auth";

import Breadcrumbs from "@/components/Breadcrumbs";
import HumasServiceFormCard from "@/components/HumasServiceFormCard";
import { authOptions } from "@/lib/auth";
import { CacheKeys, CacheTags, CacheConfig, rememberWithMetrics } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { entityLabel } from "@/lib/uiLabels";

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

export default async function HumasDashboard({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  // Quick guard message (middleware also protects)
  if (!(role === "humas")) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">HUMAS</h2>
        <p>Akses ditolak. Silakan masuk sebagai HUMAS.</p>
      </div>
    );
  }

  // Filters (same semantics as Status HUMAS)
  const q = (getParam(searchParams, "q") ?? "").trim();
  const fromStr = getParam(searchParams, "from");
  const toStr = getParam(searchParams, "to");
  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(toStr) : undefined;
  let toEnd: Date | undefined;
  if (to) {
    toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
  }
  const dateRange = from || toEnd ? { gte: from, lte: toEnd } : undefined;

  const complaintBaseWhere: any = {
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
  };

  // KPI counters and data with error handling
  let baruCount = 0;
  let prosesCount = 0;
  let selesaiCount = 0;
  let totalCount = 0;
  let latestComplaints: any[] = [];
  let latestServices: any[] = [];

  try {
    // ✅ PERFORMANCE: Cache KPI queries with dashboard-specific cache keys
    const dashboardFilters = { dateRange, searchTerm: q };
    const kpiCacheKey = CacheKeys.dashboard.kpis(dashboardFilters);
    const latestComplaintsCacheKey = `dashboard:latest-complaints:${JSON.stringify(dashboardFilters)}`;
    const latestServicesCacheKey = `dashboard:latest-services:${JSON.stringify(dashboardFilters)}`;

    // KPI counters (matching HUMAS Status) with filters - parallel execution with caching
    [baruCount, prosesCount, selesaiCount, totalCount] = await rememberWithMetrics(
      kpiCacheKey,
      () =>
        Promise.all([
          prisma.complaint.count({
            where: {
              ...complaintBaseWhere,
              AND: [
                { processedAt: null },
                { serviceRequestId: null },
                { workOrderId: null },
                { repairReportId: null },
              ],
            },
          }),
          prisma.complaint.count({
            where: {
              ...complaintBaseWhere,
              AND: [
                { repairReportId: null },
                { OR: [{ serviceRequestId: { not: null } }, { workOrderId: { not: null } }] },
              ],
            },
          }),
          prisma.complaint.count({
            where: { ...complaintBaseWhere, repairReportId: { not: null } },
          }),
          prisma.complaint.count({ where: complaintBaseWhere }),
        ]),
      CacheConfig.DASHBOARD_TTL,
      [CacheTags.DASHBOARD, CacheTags.STATISTICS, CacheTags.COMPLAINTS],
    );

    // ✅ PERFORMANCE: Cache latest complaints and services separately
    const [cachedLatestComplaints, cachedLatestServices] = await Promise.all([
      rememberWithMetrics(
        latestComplaintsCacheKey,
        () =>
          prisma.complaint.findMany({
            where: {
              AND: [
                { processedAt: null },
                { serviceRequestId: null },
                { workOrderId: null },
                { repairReportId: null },
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
        CacheConfig.DASHBOARD_TTL,
        [CacheTags.DASHBOARD, CacheTags.COMPLAINTS],
      ),
      rememberWithMetrics(
        latestServicesCacheKey,
        () =>
          prisma.serviceRequest.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
        CacheConfig.DASHBOARD_TTL,
        [CacheTags.DASHBOARD, CacheTags.SERVICE_REQUESTS],
      ),
    ]);

    latestComplaints = cachedLatestComplaints;
    latestServices = cachedLatestServices;
  } catch (e: any) {
    // If DB is unreachable, show a friendly message instead of a runtime crash
    logger.error(
      e instanceof Error ? e : new Error(String(e?.message ?? e)),
      "HUMAS dashboard DB error",
    );
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">HUMAS</h2>
        <p className="text-red-600">
          Tidak dapat menghubungi server database. Silakan pastikan database berjalan dan
          konfigurasi `DATABASE_URL` sudah benar. (Detail: {String(e?.message ?? e)})
        </p>
        <p className="text-sm text-gray-600">
          Tips: jalankan database lokal atau docker-compose lalu coba lagi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "HUMAS" }]} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dashboard HUMAS</h2>
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

      {/* Filter bar (mirrors Status HUMAS quick presets) */}
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
          return `?${sp.toString()}`;
        };
        return (
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
            <div className="flex gap-2">
              <button type="submit" className="btn btn-sm">
                Terapkan
              </button>
              <Link className="btn-outline btn-sm" href="/humas">
                Reset
              </Link>
            </div>
          </form>
        );
      })()}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Form {entityLabel("serviceRequest")}</h3>
          </div>
          <HumasServiceFormCard />
        </div>
        <div className="space-y-6">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Pengaduan Masuk (Belum diproses)</h3>
              <Link
                className="text-blue-700 hover:underline text-sm"
                href="/humas/daftar-data?tab=complaint"
              >
                Lihat semua
              </Link>
            </div>
            <ul className="divide-y">
              {latestComplaints.map((c) => {
                const params = new URLSearchParams({
                  flow: "service",
                  customerName: c.customerName || "",
                  address: c.address || "",
                  phone: c.phone || "",
                  connectionNumber: c.connectionNumber || "",
                  category: c.category || "",
                  complaintId: c.id,
                });
                return (
                  <li key={c.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.customerName}</div>
                      <div className="text-xs text-gray-600 truncate">{c.address}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </span>
                      <Link
                        className="btn-outline btn-sm"
                        href={`/daftar-data/complaint/${c.id}?scope=humas`}
                      >
                        Detail
                      </Link>
                      <Link className="btn-outline btn-sm" href={`/${"?" + params.toString()}`}>
                        Buat Service
                      </Link>
                    </div>
                  </li>
                );
              })}
              {latestComplaints.length === 0 && (
                <li className="py-6 text-center text-gray-500">Belum ada pengaduan.</li>
              )}
            </ul>
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
              {latestServices.map((s) => (
                <li key={s.id} className="py-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.customerName}</div>
                    <div className="text-xs text-gray-600 truncate">{s.address}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      className="btn-outline btn-sm"
                      href={`/daftar-data/service/${s.id}?scope=humas`}
                    >
                      Detail
                    </Link>
                  </div>
                </li>
              ))}
              {latestServices.length === 0 && (
                <li className="py-6 text-center text-gray-500">Belum ada data.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
