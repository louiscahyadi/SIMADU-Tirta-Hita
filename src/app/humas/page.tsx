import Link from "next/link";
import { getServerSession } from "next-auth";

import Breadcrumbs from "@/components/Breadcrumbs";
import HumasServiceFormCard from "@/components/HumasServiceFormCard";
import PrintButton from "@/components/PrintButton";
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

export default async function HumasDashboard({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role as string | undefined;

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

  // KPI counters (matching HUMAS Status) with filters
  const [baruCount, prosesCount, selesaiCount, totalCount] = await Promise.all([
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
    prisma.complaint.count({ where: { ...complaintBaseWhere, repairReportId: { not: null } } }),
    prisma.complaint.count({ where: complaintBaseWhere }),
  ]);

  // Incoming complaints: not yet processed and no SR/WO/RR linked
  const latestComplaints = await prisma.complaint.findMany({
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
  });
  const latestServices = await prisma.serviceRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "HUMAS" }]} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dashboard HUMAS</h2>
        <div className="flex gap-2">
          <PrintButton />
          <Link className="btn-outline btn-sm" href="/humas/status">
            Lihat Status
          </Link>
          <Link className="btn-outline btn-sm" href="/daftar-data?tab=service">
            Lihat semua data
          </Link>
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

      {/* KPI counters */}
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="card p-3">
          <div className="text-xs text-gray-500">Baru</div>
          <div className="text-xl font-semibold">{baruCount}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-gray-500">Proses</div>
          <div className="text-xl font-semibold">{prosesCount}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-gray-500">Selesai</div>
          <div className="text-xl font-semibold">{selesaiCount}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-xl font-semibold">{totalCount}</div>
        </div>
      </div>

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
                href="/daftar-data?tab=complaint"
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
                      <Link className="btn-outline btn-sm" href={`/${"?" + params.toString()}`}>
                        Buat Permintaan Service
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
                href="/daftar-data?tab=service"
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
                    <Link className="btn-outline btn-sm" href={`/daftar-data/service/${s.id}`}>
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
