import Link from "next/link";
import { getServerSession } from "next-auth";

import Breadcrumbs from "@/components/Breadcrumbs";
import PrintButton from "@/components/PrintButton";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

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

export default async function DistribusiDashboard({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!(role === "distribusi")) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">DISTRIBUSI</h2>
        <p>Akses ditolak. Silakan masuk sebagai DISTRIBUSI.</p>
      </div>
    );
  }

  // Filters (same semantics as Distribusi Status)
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

  const woWhereBase: any = {
    ...(dateRange ? { createdAt: dateRange } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { reporterName: { contains: q, mode: "insensitive" } },
            { disturbanceLocation: { contains: q, mode: "insensitive" } },
            { disturbanceType: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { executorName: { contains: q, mode: "insensitive" } },
            { team: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const rrWhereBase: any = {
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

  // KPI counters (matching Distribusi Status) with filters
  let spkProses = 0;
  let spkSelesai = 0;
  let spkTotal = 0;
  let baTotal = 0;
  let latestWO: any[] = [];
  let latestRR: any[] = [];
  let needWO: any[] = [];
  let needRR: any[] = [];

  try {
    [spkProses, spkSelesai, spkTotal, baTotal] = await Promise.all([
      prisma.workOrder.count({ where: { ...woWhereBase, repairReport: { is: null } } }),
      prisma.workOrder.count({ where: { ...woWhereBase, repairReport: { isNot: null } } }),
      prisma.workOrder.count({ where: woWhereBase }),
      prisma.repairReport.count({ where: rrWhereBase }),
    ]);

    latestWO = await prisma.workOrder.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
    latestRR = await prisma.repairReport.findMany({ orderBy: { createdAt: "desc" }, take: 5 });

    // Items needing SPK: ServiceRequests with no linked WorkOrder yet
    needWO = await prisma.serviceRequest.findMany({
      where: { workOrder: { is: null } },
      orderBy: { createdAt: "asc" },
      take: 5,
    });
    // Items needing BA: WorkOrders with no linked RepairReport yet
    needRR = await prisma.workOrder.findMany({
      where: { repairReport: { is: null } },
      orderBy: { createdAt: "asc" },
      take: 5,
      include: {
        complaint: {
          select: {
            id: true,
          },
        },
      },
    });
  } catch (e: any) {
    // If DB is unreachable (Prisma can't connect), show a friendly message instead of a runtime crash
    // Log error for server-side debugging
    logger.error(
      e instanceof Error ? e : new Error(String(e?.message ?? e)),
      "Distribusi dashboard DB error",
    );
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">DISTRIBUSI</h2>
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
      <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "DISTRIBUSI" }]} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dashboard DISTRIBUSI</h2>
        <div className="flex gap-2">
          <PrintButton />
          <Link className="btn-outline btn-sm" href="/distribusi/status">
            Lihat Status
          </Link>
          <Link className="btn-outline btn-sm" href="/distribusi/status#workorder">
            Lihat SPK
          </Link>
          <Link className="btn-outline btn-sm" href="/distribusi/status#repair">
            Lihat Berita Acara
          </Link>
        </div>
      </div>

      {/* KPI counters */}
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="card p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-orange-700">SPK Proses</div>
            <div className="p-2 bg-orange-500 rounded-lg">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-orange-900">{spkProses}</div>
          <div className="text-xs text-orange-600 mt-1">Sedang dikerjakan</div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-emerald-700">SPK Selesai</div>
            <div className="p-2 bg-emerald-500 rounded-lg">
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
          <div className="text-2xl font-bold text-emerald-900">{spkSelesai}</div>
          <div className="text-xs text-emerald-600 mt-1">Telah diselesaikan</div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-blue-700">SPK Total</div>
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-900">{spkTotal}</div>
          <div className="text-xs text-blue-600 mt-1">Total SPK</div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-purple-700">BA Total</div>
            <div className="p-2 bg-purple-500 rounded-lg">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-900">{baTotal}</div>
          <div className="text-xs text-purple-600 mt-1">Total Berita Acara</div>
        </div>
      </div>

      {/* Filter bar (mirrors Status Distribusi quick presets) */}
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
                placeholder="Cari nomor, lokasi, tim..."
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
              <Link className="btn-outline btn-sm" href="/distribusi">
                Reset
              </Link>
            </div>
          </form>
        );
      })()}

      {/* Form input dihilangkan dari halaman utama Distribusi sesuai permintaan */}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Perlu SPK</h3>
            <Link className="text-blue-700 hover:underline text-sm" href="/distribusi/status#psp">
              Lihat semua
            </Link>
          </div>
          <ul className="divide-y">
            {needWO.map((s) => {
              const params = new URLSearchParams({ flow: "workorder", serviceRequestId: s.id });
              return (
                <li key={s.id} className="py-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {(s as any).reporterName ?? s.customerName}
                    </div>
                    <div className="text-xs text-gray-600 truncate">{s.address}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(s.createdAt)}
                    </span>
                    <Link className="btn-outline btn-sm" href={`/${"?" + params.toString()}`}>
                      Buat SPK
                    </Link>
                  </div>
                </li>
              );
            })}
            {needWO.length === 0 && (
              <li className="py-6 text-center text-gray-500">Tidak ada item.</li>
            )}
          </ul>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Perlu Berita Acara</h3>
            <Link
              className="text-blue-700 hover:underline text-sm"
              href="/distribusi/status#workorder"
            >
              Lihat semua
            </Link>
          </div>
          <div className="text-xs text-gray-600 mb-3">
            SPK yang sudah selesai dikerjakan di lapangan dan perlu dibuatkan berita acara
          </div>
          <ul className="divide-y">
            {needRR.map((w) => {
              const params = new URLSearchParams({ flow: "repair", workOrderId: w.id });
              // Add complaintId if available from workOrder
              if (w.complaint?.id) {
                params.set("complaintId", w.complaint.id);
              }
              return (
                <li key={w.id} className="py-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{w.number ?? "Tanpa nomor"}</div>
                    <div className="text-xs text-gray-600 truncate">
                      {w.disturbanceLocation ?? "-"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(w.createdAt)}
                    </span>
                    <Link className="btn-outline btn-sm" href={`/${"?" + params.toString()}`}>
                      Buat BA
                    </Link>
                  </div>
                </li>
              );
            })}
            {needRR.length === 0 && (
              <li className="py-6 text-center text-gray-500">Tidak ada item.</li>
            )}
          </ul>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">SPK Terbaru</h3>
            <Link
              className="text-blue-700 hover:underline text-sm"
              href="/distribusi/status#workorder"
            >
              Lihat semua
            </Link>
          </div>
          <ul className="divide-y">
            {latestWO.map((w) => (
              <li key={w.id} className="py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{w.number ?? "Tanpa nomor"}</div>
                  <div className="text-xs text-gray-600 truncate">
                    {w.disturbanceLocation ?? "-"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(w.createdAt)}
                  </span>
                  <Link className="btn-outline btn-sm" href={`/daftar-data/workorder/${w.id}`}>
                    Detail
                  </Link>
                </div>
              </li>
            ))}
            {latestWO.length === 0 && (
              <li className="py-6 text-center text-gray-500">Belum ada SPK.</li>
            )}
          </ul>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Berita Acara Terbaru</h3>
            <Link
              className="text-blue-700 hover:underline text-sm"
              href="/distribusi/status#repair"
            >
              Lihat semua
            </Link>
          </div>
          <ul className="divide-y">
            {latestRR.map((r) => (
              <li key={r.id} className="py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.team ?? r.executorName ?? "-"}</div>
                  <div className="text-xs text-gray-600 truncate">{r.city ?? "-"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(r.createdAt)}
                  </span>
                  <Link className="btn-outline btn-sm" href={`/daftar-data/repair/${r.id}`}>
                    Detail
                  </Link>
                </div>
              </li>
            ))}
            {latestRR.length === 0 && (
              <li className="py-6 text-center text-gray-500">Belum ada berita acara.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
