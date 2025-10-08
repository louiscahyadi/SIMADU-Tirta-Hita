import Link from "next/link";

import Breadcrumbs from "@/components/Breadcrumbs";
import { prisma } from "@/lib/prisma";

function formatDate(d?: Date | string | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(dt);
  } catch {
    return dt.toISOString();
  }
}

export default async function ComplaintDetail({ params }: { params: { id: string } }) {
  const c = await (prisma as any).complaint.findUnique({
    where: { id: params.id },
  });
  if (!c) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Detail Pengaduan</h2>
        <p className="text-red-600">Data tidak ditemukan.</p>
        <Link className="text-blue-700 hover:underline" href="/daftar-data?tab=complaint">
          ← Kembali
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "Daftar Data", href: "/daftar-data" },
          { label: "Pengaduan Pelanggan", href: "/daftar-data?tab=complaint" },
          { label: `Pengaduan: ${c.customerName ?? params.id}` },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Detail Pengaduan</h2>
        <Link className="text-sm text-blue-700 hover:underline" href="/daftar-data?tab=complaint">
          ← Kembali
        </Link>
      </div>
      <div className="card p-4 text-sm space-y-2">
        <div>
          <span className="text-gray-600">Tgl:</span> {formatDate(c.createdAt)}
        </div>
        <div>
          <span className="text-gray-600">Nama:</span> {c.customerName}
        </div>
        <div>
          <span className="text-gray-600">Alamat:</span> {c.address}
        </div>
        <div>
          <span className="text-gray-600">No. SL:</span> {c.connectionNumber || "-"}
        </div>
        <div>
          <span className="text-gray-600">No HP:</span> {c.phone || "-"}
        </div>
        <div>
          <span className="text-gray-600">Kategori:</span> {c.category}
        </div>
        <div>
          <span className="text-gray-600">Keluhan:</span> {c.complaintText}
        </div>
        {c.mapsLink ? (
          <div>
            <a
              className="text-blue-700 hover:underline"
              href={c.mapsLink}
              target="_blank"
              rel="noreferrer"
            >
              Buka Maps
            </a>
          </div>
        ) : null}
      </div>
      <div className="card p-4 text-sm">
        <div className="font-medium mb-2">Keterkaitan</div>
        <div className="flex items-center gap-2">
          {c.serviceRequestId ? (
            <Link
              className="btn-outline btn-sm"
              href={`/daftar-data/service/${c.serviceRequestId}`}
            >
              SR
            </Link>
          ) : (
            <span className="text-gray-400">SR -</span>
          )}
          {c.workOrderId ? (
            <Link className="btn-outline btn-sm" href={`/daftar-data/workorder/${c.workOrderId}`}>
              WO
            </Link>
          ) : (
            <span className="text-gray-400">WO -</span>
          )}
          {c.repairReportId ? (
            <Link className="btn-outline btn-sm" href={`/daftar-data/repair/${c.repairReportId}`}>
              RR
            </Link>
          ) : (
            <span className="text-gray-400">RR -</span>
          )}
        </div>
      </div>
    </div>
  );
}
