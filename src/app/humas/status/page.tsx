import Link from "next/link";
import { getServerSession } from "next-auth";

import Breadcrumbs from "@/components/Breadcrumbs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(toStr) : undefined;
  let toEnd: Date | undefined = undefined;
  if (to) {
    toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
  }
  const dateRange = from || toEnd ? { gte: from, lte: toEnd } : undefined;

  // Build where clauses
  const complaintWhere: any = {
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
      : status === "proses"
        ? {
            AND: [
              {
                OR: [{ serviceRequestId: { not: null } }, { workOrderId: { not: null } }],
              },
              { repairReportId: null },
            ],
          }
        : status === "selesai"
          ? { repairReportId: { not: null } }
          : {}),
  };

  const serviceWhere: any = {
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
  // Base where for KPI counters (same filter by date/q, without narrowing by selected status)
  const complaintWhereBase: any = {
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
        ...complaintWhereBase,
        AND: [
          { repairReportId: null },
          { OR: [{ serviceRequestId: { not: null } }, { workOrderId: { not: null } }] },
        ],
      },
    }),
    prisma.complaint.count({ where: { ...complaintWhereBase, repairReportId: { not: null } } }),
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
  });

  // Build relation maps for Service -> WO -> RR to show processing badge
  const srIds = services.map((s) => s.id);
  let srToWo = new Map<string, string>();
  let woHasRr = new Set<string>();
  if (srIds.length) {
    const wos = (await (prisma as any).workOrder.findMany({
      where: { serviceRequestId: { in: srIds } },
      select: { id: true, serviceRequestId: true },
    })) as Array<{ id: string; serviceRequestId: string | null }>;
    const woIds = wos.map((w) => w.id);
    for (const w of wos) if (w.serviceRequestId) srToWo.set(w.serviceRequestId, w.id);
    if (woIds.length) {
      const rrs = (await (prisma as any).repairReport.findMany({
        where: { workOrderId: { in: woIds } },
        select: { workOrderId: true },
      })) as Array<{ workOrderId: string | null }>;
      for (const r of rrs) if (r.workOrderId) woHasRr.add(r.workOrderId);
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
