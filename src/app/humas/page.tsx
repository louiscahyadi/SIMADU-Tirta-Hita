import Link from "next/link";
import { getServerSession } from "next-auth";

import Breadcrumbs from "@/components/Breadcrumbs";
import HumasServiceFormCard from "@/components/HumasServiceFormCard";
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

export default async function HumasDashboard() {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role as string | undefined;

  // Quick guard message (middleware also protects)
  if (!(role === "admin" || role === "humas")) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">HUMAS</h2>
        <p>Akses ditolak. Silakan masuk sebagai HUMAS.</p>
      </div>
    );
  }

  const latestComplaints = await prisma.complaint.findMany({
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
          <Link className="btn-outline btn-sm" href="/humas/status">
            Lihat Status
          </Link>
          <Link className="btn-outline btn-sm" href="/daftar-data?tab=service">
            Lihat semua data
          </Link>
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
              <h3 className="font-medium">Pengaduan Terbaru</h3>
              <Link
                className="text-blue-700 hover:underline text-sm"
                href="/daftar-data?tab=complaint"
              >
                Lihat semua
              </Link>
            </div>
            <ul className="divide-y">
              {latestComplaints.map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.customerName}</div>
                    <div className="text-xs text-gray-600 truncate">{c.address}</div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {formatDate(c.createdAt)}
                  </div>
                </li>
              ))}
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
