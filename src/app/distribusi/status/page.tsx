import Link from "next/link";
import { getServerSession } from "next-auth";

import Breadcrumbs from "@/components/Breadcrumbs";
import DistribusiStatusFilters from "@/components/DistribusiStatusFilters";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entityAbbr } from "@/lib/uiLabels";

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

export default async function DistribusiStatusPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "distribusi") {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Status DISTRIBUSI</h2>
        <p>Akses ditolak.</p>
      </div>
    );
  }

  // Filters
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

  const woWhere: any = {
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
  const rrWhere: any = {
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
  // PSP queue (ServiceRequest) – only items that are ready for Distribusi (linked complaint status PSP_CREATED) and belum punya SPK
  const srWhere: any = {
    ...(dateRange ? { createdAt: dateRange } : {}),
    complaint: { is: { status: "PSP_CREATED" as any } },
    workOrder: { is: null },
    ...(q
      ? {
          OR: [
            { reporterName: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { reporterPhone: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  // Pagination params
  const wSizeParam = parseInt(getParam(searchParams, "wSize") || "10", 10);
  const wSize = Number.isFinite(wSizeParam) && wSizeParam > 0 ? Math.min(wSizeParam, 100) : 10;
  const wPageParam = parseInt(getParam(searchParams, "wPage") || "1", 10);
  const wPage = Number.isFinite(wPageParam) && wPageParam > 0 ? wPageParam : 1;

  const rSizeParam = parseInt(getParam(searchParams, "rSize") || "10", 10);
  const rSize = Number.isFinite(rSizeParam) && rSizeParam > 0 ? Math.min(rSizeParam, 100) : 10;
  const rPageParam = parseInt(getParam(searchParams, "rPage") || "1", 10);
  const rPage = Number.isFinite(rPageParam) && rPageParam > 0 ? rPageParam : 1;
  // Pagination for PSP queue
  const pSizeParam = parseInt(getParam(searchParams, "pSize") || "10", 10);
  const pSize = Number.isFinite(pSizeParam) && pSizeParam > 0 ? Math.min(pSizeParam, 100) : 10;
  const pPageParam = parseInt(getParam(searchParams, "pPage") || "1", 10);
  const pPage = Number.isFinite(pPageParam) && pPageParam > 0 ? pPageParam : 1;

  // Totals for pagination and KPI
  const [wTotal, rTotal, spkProses, spkSelesai, baTotal, pTotal] = await Promise.all([
    prisma.workOrder.count({ where: woWhere }),
    prisma.repairReport.count({ where: rrWhere }),
    prisma.workOrder.count({ where: { ...woWhere, repairReport: { is: null } } }),
    prisma.workOrder.count({ where: { ...woWhere, repairReport: { isNot: null } } }),
    prisma.repairReport.count({ where: rrWhere }),
    prisma.serviceRequest.count({ where: srWhere }),
  ]);

  const workorders = await prisma.workOrder.findMany({
    where: woWhere,
    orderBy: { createdAt: "desc" },
    skip: (wPage - 1) * wSize,
    take: wSize,
  });
  const repairs = await prisma.repairReport.findMany({
    where: rrWhere,
    orderBy: { createdAt: "desc" },
    skip: (rPage - 1) * rSize,
    take: rSize,
  });
  const psps = await prisma.serviceRequest.findMany({
    where: srWhere,
    orderBy: { createdAt: "desc" },
    skip: (pPage - 1) * pSize,
    take: pSize,
    include: { complaint: { select: { id: true, status: true } } },
  });

  // Build a set of WO IDs that already have a Repair Report
  const woIds = workorders.map((w) => w.id);
  const rrSet = new Set<string>();
  if (woIds.length) {
    const rrByWo = (await (prisma as any).repairReport.findMany({
      where: { workOrderId: { in: woIds } },
      select: { workOrderId: true },
    })) as Array<{ workOrderId: string | null }>;
    for (const r of rrByWo) if (r.workOrderId) rrSet.add(r.workOrderId);
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "DISTRIBUSI", href: "/distribusi" },
          { label: "Status" },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Status DISTRIBUSI</h2>
      </div>

      {/* Filter bar (client-side, persisted) */}
      <DistribusiStatusFilters
        initialQ={q}
        initialFrom={fromStr || ""}
        initialTo={toStr || ""}
        initialWSize={wSize}
        initialRSize={rSize}
        initialPSize={pSize}
      />

      {/* Antrian PSP */}
      <div id="psp" className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Antrian PSP</h3>
          <div className="text-sm text-gray-600">Total: {pTotal}</div>
        </div>
        <ul className="divide-y">
          {psps.map((s) => {
            const sr: any = s as any;
            const compId = (s as any).complaint?.id as string | undefined;
            return (
              <li key={s.id} className="py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {sr.reporterName ?? s.customerName ?? "-"}
                    </div>
                    <div className="text-xs text-gray-600 truncate">{s.address}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                        {entityAbbr("serviceRequest")}
                      </span>
                      {/* Urgensi dihapus dari tampilan antrian PSP */}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate((sr.requestDate as Date | undefined) ?? s.createdAt)}
                    </span>
                    <Link className="btn-outline btn-sm" href={`/daftar-data/service/${s.id}`}>
                      Detail
                    </Link>
                    {compId ? (
                      <Link
                        className="btn-outline btn-sm"
                        href={`/?flow=workorder&serviceRequestId=${encodeURIComponent(s.id)}&complaintId=${encodeURIComponent(compId)}`}
                        title="Buat SPK dari PSP ini"
                      >
                        Buat SPK
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">Tanpa Kasus</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          {psps.length === 0 && (
            <li className="py-6 text-center text-gray-500">Tidak ada antrian PSP.</li>
          )}
        </ul>
        {/* Pagination for PSP */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil(pTotal / pSize));
          const prev = new URLSearchParams();
          for (const [k, v] of Object.entries(searchParams ?? {}))
            if (v != null) prev.set(k, Array.isArray(v) ? v[0]! : v);
          prev.set("pPage", String(Math.max(1, pPage - 1)));
          prev.set("pSize", String(pSize));
          const next = new URLSearchParams(prev);
          next.set("pPage", String(Math.min(totalPages, pPage + 1)));
          return (
            <div className="pt-3 flex items-center justify-between text-sm text-gray-600">
              <div>
                Hal. {pPage} / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  className={`btn-outline btn-sm ${pPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
                  href={`?${prev.toString()}#psp`}
                >
                  Sebelumnya
                </Link>
                <Link
                  className={`btn-outline btn-sm ${pPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
                  href={`?${next.toString()}#psp`}
                >
                  Berikutnya
                </Link>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div id="workorder" className="card p-4">
          {/* KPI untuk SPK/BA (menggunakan filter saat ini) */}
          <div className="grid grid-cols-4 gap-2 mb-3 text-sm">
            <div className="card p-2">
              <div className="text-xs text-gray-500">SPK Proses</div>
              <div className="text-lg font-semibold">{spkProses}</div>
            </div>
            <div className="card p-2">
              <div className="text-xs text-gray-500">SPK Selesai</div>
              <div className="text-lg font-semibold">{spkSelesai}</div>
            </div>
            <div className="card p-2">
              <div className="text-xs text-gray-500">SPK Total</div>
              <div className="text-lg font-semibold flex items-center gap-2">
                {wTotal}
                {(() => {
                  const sp = new URLSearchParams();
                  if (q) sp.set("q", q);
                  if (fromStr) sp.set("from", fromStr);
                  if (toStr) sp.set("to", toStr);
                  sp.set("tab", "workorder");
                  return (
                    <Link
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 text-xs"
                      href={`/distribusi/status?${sp.toString()}#workorder`}
                      title="Lihat di Status Distribusi"
                    >
                      Lihat
                    </Link>
                  );
                })()}
              </div>
            </div>
            <div className="card p-2">
              <div className="text-xs text-gray-500">BA Total</div>
              <div className="text-lg font-semibold">{baTotal}</div>
            </div>
          </div>
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
            {workorders.map((w) => {
              const hasRR = rrSet.has(w.id);
              return (
                <li key={w.id} className="py-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{w.number ?? "Tanpa nomor"}</div>
                      <div className="text-xs text-gray-600 truncate">
                        {w.disturbanceLocation ?? "-"}
                      </div>
                      <div className="mt-1 text-xs">
                        {hasRR ? (
                          <span className="rounded-full bg-green-600 px-2 py-0.5 text-white">
                            Selesai
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                            Sedang diproses
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {formatDate(w.createdAt)}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                      {entityAbbr("workOrder")}
                    </span>
                  </div>
                </li>
              );
            })}
            {workorders.length === 0 && (
              <li className="py-6 text-center text-gray-500">Belum ada SPK.</li>
            )}
          </ul>
          {/* Pagination for SPK */}
          {(() => {
            const totalPages = Math.max(1, Math.ceil(wTotal / wSize));
            const prev = new URLSearchParams();
            for (const [k, v] of Object.entries(searchParams ?? {}))
              if (v != null) prev.set(k, Array.isArray(v) ? v[0]! : v);
            prev.set("wPage", String(Math.max(1, wPage - 1)));
            prev.set("wSize", String(wSize));
            const next = new URLSearchParams(prev);
            next.set("wPage", String(Math.min(totalPages, wPage + 1)));
            return (
              <div className="pt-3 flex items-center justify-between text-sm text-gray-600">
                <div>
                  Hal. {wPage} / {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    className={`btn-outline btn-sm ${wPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
                    href={`?${prev.toString()}#workorder`}
                  >
                    Sebelumnya
                  </Link>
                  <Link
                    className={`btn-outline btn-sm ${wPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
                    href={`?${next.toString()}#workorder`}
                  >
                    Berikutnya
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
        <div id="repair" className="card p-4">
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
            {repairs.map((r) => (
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
            {repairs.length === 0 && (
              <li className="py-6 text-center text-gray-500">Belum ada berita acara.</li>
            )}
          </ul>
          {/* Pagination for BA */}
          {(() => {
            const totalPages = Math.max(1, Math.ceil(rTotal / rSize));
            const prev = new URLSearchParams();
            for (const [k, v] of Object.entries(searchParams ?? {}))
              if (v != null) prev.set(k, Array.isArray(v) ? v[0]! : v);
            prev.set("rPage", String(Math.max(1, rPage - 1)));
            prev.set("rSize", String(rSize));
            const next = new URLSearchParams(prev);
            next.set("rPage", String(Math.min(totalPages, rPage + 1)));
            return (
              <div className="pt-3 flex items-center justify-between text-sm text-gray-600">
                <div>
                  Hal. {rPage} / {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    className={`btn-outline btn-sm ${rPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
                    href={`?${prev.toString()}#repair`}
                  >
                    Sebelumnya
                  </Link>
                  <Link
                    className={`btn-outline btn-sm ${rPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
                    href={`?${next.toString()}#repair`}
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
