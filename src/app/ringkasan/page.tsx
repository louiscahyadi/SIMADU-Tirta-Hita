import Link from "next/link";
import { getServerSession } from "next-auth";

import Breadcrumbs from "@/components/Breadcrumbs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entityLabel } from "@/lib/uiLabels";

export const dynamic = "force-dynamic";

export default async function RingkasanPage() {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role as string | undefined;

  // Fetch some quick counts
  const [complaintsNew, complaintsProcessed, srCount, woCount, rrCount] = await Promise.all([
    (prisma as any).complaint.count({
      where: {
        AND: [
          { processedAt: null },
          { serviceRequestId: null },
          { workOrderId: null },
          { repairReportId: null },
        ],
      },
    }),
    (prisma as any).complaint.count({
      where: {
        OR: [
          { processedAt: { not: null } },
          { serviceRequestId: { not: null } },
          { workOrderId: { not: null } },
          { repairReportId: { not: null } },
        ],
      },
    }),
    prisma.serviceRequest.count(),
    prisma.workOrder.count(),
    prisma.repairReport.count(),
  ]);

  // Latest entries for role progress (limit 5)
  const [latestComplaintsNew, latestSrNoWo, latestWoNoRr] = await Promise.all([
    (prisma as any).complaint.findMany({
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
      select: {
        id: true,
        createdAt: true,
        customerName: true,
        address: true,
        phone: true,
        connectionNumber: true,
        category: true,
      },
    }),
    prisma.serviceRequest.findMany({
      where: { workOrder: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        customerName: true,
        address: true,
        serviceNumber: true,
        phone: true,
      },
    }),
    prisma.workOrder.findMany({
      where: { repairReport: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        number: true,
        disturbanceLocation: true,
      },
    }),
  ]);

  const Card = ({
    title,
    value,
    href,
    hint,
  }: {
    title: string;
    value: number | string;
    href?: string;
    hint?: string;
  }) => (
    <div className="rounded-lg border p-4 bg-white">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {href ? (
        <Link className="text-blue-700 hover:underline text-sm" href={href}>
          Lihat
        </Link>
      ) : null}
      {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
    </div>
  );

  // Role-specific quick actions
  const Actions = () => {
    if (role === "humas") {
      return (
        <div className="space-y-2">
          <div className="font-medium">Aksi Cepat (Humas)</div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-outline" href="/daftar-data?tab=complaint">
              Buka Pengaduan
            </Link>
          </div>
        </div>
      );
    }
    if (role === "distribusi") {
      return (
        <div className="space-y-2">
          <div className="font-medium">Aksi Cepat (Distribusi)</div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-outline" href="/daftar-data?tab=service">
              Lihat Permintaan Service
            </Link>
            <Link className="btn-outline" href="/daftar-data?tab=workorder">
              Lihat Surat Perintah Kerja
            </Link>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "Ringkasan", href: "/ringkasan" },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ringkasan</h2>
        <span className="text-sm text-gray-600">Peran: {role ?? "-"}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Pengaduan Baru"
          value={complaintsNew}
          href="/daftar-data?tab=complaint&status=baru"
        />
        <Card
          title="Pengaduan Diproses"
          value={complaintsProcessed}
          href="/daftar-data?tab=complaint&status=processed"
        />
        <Card
          title={entityLabel("serviceRequest")}
          value={srCount}
          href="/daftar-data?tab=service"
        />
        <Card title={entityLabel("workOrder")} value={woCount} href="/daftar-data?tab=workorder" />
        <Card title={entityLabel("repairReport")} value={rrCount} href="/daftar-data?tab=repair" />
      </div>

      <Actions />

      {/* Detail progres per role */}
      {role === "humas" && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Pengaduan Baru (5 terbaru)</h3>
            <Link
              className="text-blue-700 hover:underline text-sm"
              href="/daftar-data?tab=complaint&status=baru"
            >
              Lihat semua
            </Link>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left">Tgl</th>
                  <th className="px-3 py-2 text-left">Nama</th>
                  <th className="px-3 py-2 text-left">Kategori</th>
                  <th className="px-3 py-2 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {latestComplaintsNew.map((c: any) => {
                  const href =
                    `/` +
                    `?flow=service&complaintId=${encodeURIComponent(c.id)}` +
                    `&customerName=${encodeURIComponent(c.customerName || "")}` +
                    `&address=${encodeURIComponent(c.address || "")}` +
                    `&phone=${encodeURIComponent(c.phone || "")}` +
                    `&connectionNumber=${encodeURIComponent(c.connectionNumber || "")}` +
                    `&category=${encodeURIComponent(c.category || "")}`;
                  return (
                    <tr key={c.id} className="odd:bg-white even:bg-gray-50 border-b">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(c.createdAt))}
                      </td>
                      <td className="px-3 py-2">{c.customerName}</td>
                      <td className="px-3 py-2">{c.category}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {role === "humas" ? (
                          <Link className="btn-outline btn-sm" href={href}>
                            Buat Permintaan Service
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {latestComplaintsNew.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>
                      Tidak ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {role === "distribusi" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Permintaan Service tanpa Surat Perintah Kerja (5 terbaru)
              </h3>
              <Link
                className="text-blue-700 hover:underline text-sm"
                href="/daftar-data?tab=service"
              >
                Lihat semua
              </Link>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left">Tgl</th>
                    <th className="px-3 py-2 text-left">Nama</th>
                    <th className="px-3 py-2 text-left">Alamat</th>
                    <th className="px-3 py-2 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {latestSrNoWo.map((s: any) => {
                    const href = `/?flow=workorder&serviceRequestId=${encodeURIComponent(s.id)}`;
                    return (
                      <tr key={s.id} className="odd:bg-white even:bg-gray-50 border-b">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {new Intl.DateTimeFormat("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(s.createdAt))}
                        </td>
                        <td className="px-3 py-2">{s.customerName}</td>
                        <td className="px-3 py-2 max-w-[18rem] truncate" title={s.address}>
                          {s.address}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {role === "distribusi" ? (
                            <Link className="btn-outline btn-sm" href={href}>
                              Buat Surat Perintah Kerja
                            </Link>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {latestSrNoWo.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>
                        Tidak ada data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Surat Perintah Kerja tanpa Berita Acara (5 terbaru)
              </h3>
              <Link
                className="text-blue-700 hover:underline text-sm"
                href="/daftar-data?tab=workorder"
              >
                Lihat semua
              </Link>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left">Tgl</th>
                    <th className="px-3 py-2 text-left">No</th>
                    <th className="px-3 py-2 text-left">Lokasi Gangguan</th>
                    <th className="px-3 py-2 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {latestWoNoRr.map((w: any) => {
                    const href = `/?flow=repair&workOrderId=${encodeURIComponent(w.id)}`;
                    return (
                      <tr key={w.id} className="odd:bg-white even:bg-gray-50 border-b">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {new Intl.DateTimeFormat("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(w.createdAt))}
                        </td>
                        <td className="px-3 py-2">{w.number ?? "-"}</td>
                        <td
                          className="px-3 py-2 max-w-[18rem] truncate"
                          title={w.disturbanceLocation ?? ""}
                        >
                          {w.disturbanceLocation ?? "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {role === "distribusi" ? (
                            <Link className="btn-outline btn-sm" href={href}>
                              Buat Berita Acara
                            </Link>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {latestWoNoRr.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>
                        Tidak ada data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
