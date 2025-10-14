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

export default async function DistribusiDashboard() {
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
          <Link className="btn-outline btn-sm" href="/daftar-data?tab=workorder">
            Lihat SPK
          </Link>
          <Link className="btn-outline btn-sm" href="/daftar-data?tab=repair">
            Lihat Berita Acara
          </Link>
        </div>
      </div>

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
            <Link className="text-blue-700 hover:underline text-sm" href="/daftar-data?tab=service">
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
            <Link
              className="text-blue-700 hover:underline text-sm"
              href="/daftar-data?tab=workorder"
            >
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
            <Link
              className="text-blue-700 hover:underline text-sm"
              href="/daftar-data?tab=workorder"
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
            <Link className="text-blue-700 hover:underline text-sm" href="/daftar-data?tab=repair">
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
