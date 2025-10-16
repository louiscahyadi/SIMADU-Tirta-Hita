import Link from "next/link";
import { getServerSession } from "next-auth";

import Breadcrumbs from "@/components/Breadcrumbs";
import PrintButton from "@/components/PrintButton";
import RepairReportForm from "@/components/RepairReportForm";
import WorkOrderForm from "@/components/WorkOrderForm";
import { authOptions } from "@/lib/auth";
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

export default async function DistribusiDashboard({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role as string | undefined;

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
  const [spkProses, spkSelesai, spkTotal, baTotal] = await Promise.all([
    prisma.workOrder.count({ where: { ...woWhereBase, repairReport: { is: null } } }),
    prisma.workOrder.count({ where: { ...woWhereBase, repairReport: { isNot: null } } }),
    prisma.workOrder.count({ where: woWhereBase }),
    prisma.repairReport.count({ where: rrWhereBase }),
  ]);

  const latestWO = await prisma.workOrder.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
  const latestRR = await prisma.repairReport.findMany({ orderBy: { createdAt: "desc" }, take: 5 });

  // Items needing SPK: ServiceRequests with no linked WorkOrder yet
  const needWO = await prisma.serviceRequest.findMany({
    where: { workOrder: { is: null } },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  // Items needing BA: WorkOrders with no linked RepairReport yet
  const needRR = await prisma.workOrder.findMany({
    where: { repairReport: { is: null } },
    orderBy: { createdAt: "asc" },
    take: 5,
  });

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
          <Link className="btn-outline btn-sm" href="/distribusi/status">
            Lihat SPK
          </Link>
          <Link className="btn-outline btn-sm" href="/distribusi/status">
            Lihat Berita Acara
          </Link>
        </div>
      </div>

      {/* KPI counters */}
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="card p-3">
          <div className="text-xs text-gray-500">SPK Proses</div>
          <div className="text-xl font-semibold">{spkProses}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-gray-500">SPK Selesai</div>
          <div className="text-xl font-semibold">{spkSelesai}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-gray-500">SPK Total</div>
          <div className="text-xl font-semibold">{spkTotal}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-gray-500">BA Total</div>
          <div className="text-xl font-semibold">{baTotal}</div>
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

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="card p-4 space-y-4">
          <h3 className="font-medium">Form {entityLabel("workOrder")}</h3>
          <WorkOrderForm />
        </div>
        <div className="card p-4 space-y-4">
          <h3 className="font-medium">Form {entityLabel("repairReport")}</h3>
          <RepairReportForm />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Perlu SPK</h3>
            <Link className="text-blue-700 hover:underline text-sm" href="/distribusi">
              Lihat semua
            </Link>
          </div>
          <ul className="divide-y">
            {needWO.map((s) => {
              const params = new URLSearchParams({ flow: "workorder", serviceRequestId: s.id });
              return (
                <li key={s.id} className="py-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.customerName}</div>
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
            <Link className="text-blue-700 hover:underline text-sm" href="/distribusi/status">
              Lihat semua
            </Link>
          </div>
          <ul className="divide-y">
            {needRR.map((w) => {
              const params = new URLSearchParams({ flow: "repair", workOrderId: w.id });
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
            <Link className="text-blue-700 hover:underline text-sm" href="/distribusi/status">
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
            <Link className="text-blue-700 hover:underline text-sm" href="/distribusi/status">
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
