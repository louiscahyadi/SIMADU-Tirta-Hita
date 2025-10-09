import Link from "next/link";

import Breadcrumbs from "@/components/Breadcrumbs";
import { prisma } from "@/lib/prisma";

type PageProps = { params: { id: string } };

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

function joinJsonArray(strOrArr?: string | string[] | null) {
  if (!strOrArr) return "-";
  try {
    const arr = Array.isArray(strOrArr) ? strOrArr : JSON.parse(strOrArr);
    if (Array.isArray(arr)) return arr.filter(Boolean).join(", ") || "-";
    return "-";
  } catch {
    return "-";
  }
}

export default async function ServiceDetail({ params }: PageProps) {
  const { id } = params;
  const service = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!service) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Detail Permintaan Service</h2>
        <p className="text-red-600">Data tidak ditemukan.</p>
        <Link className="text-blue-700 hover:underline" href="/daftar-data?tab=service">
          ← Kembali ke daftar
        </Link>
      </div>
    );
  }

  // Fetch relations broadly for linking
  const wo = await (prisma as any).workOrder.findFirst({
    where: { serviceRequestId: id },
  });
  const rr = wo
    ? await (prisma as any).repairReport.findFirst({
        where: { workOrderId: wo.id },
      })
    : null;

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "Daftar Data", href: "/daftar-data" },
          { label: "Permintaan Service", href: "/daftar-data?tab=service" },
          {
            label: `Permintaan Service: ${service.serviceNumber ?? service.customerName ?? id}`,
          },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Detail Permintaan Service</h2>
        <Link className="text-sm text-blue-700 hover:underline" href="/daftar-data?tab=service">
          ← Kembali
        </Link>
      </div>
      <div className="card p-4 space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Tgl Input:</span> {formatDate(service.createdAt)}
        </div>
        <div>
          <span className="text-gray-600">Nama:</span> {service.customerName}
        </div>
        <div>
          <span className="text-gray-600">Alamat:</span> {service.address}
        </div>
        <div>
          <span className="text-gray-600">No. SL:</span> {service.serviceNumber ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Telepon:</span> {service.phone ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Alasan:</span> {joinJsonArray(service.reasons)}
        </div>
        <div>
          <span className="text-gray-600">Tindakan:</span> {service.actionTaken ?? "-"}
        </div>
      </div>
      <div className="card p-4 text-sm">
        <div className="font-medium mb-2">Keterkaitan</div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700">
            Permintaan Service
          </span>
          {wo ? (
            <Link className="btn-outline btn-sm" href={`/daftar-data/workorder/${wo.id}`}>
              Surat Perintah Kerja
            </Link>
          ) : (
            <span className="text-gray-400">Surat Perintah Kerja -</span>
          )}
          {rr ? (
            <Link className="btn-outline btn-sm" href={`/daftar-data/repair/${rr.id}`}>
              Berita Acara
            </Link>
          ) : (
            <span className="text-gray-400">Berita Acara -</span>
          )}
        </div>
      </div>
    </div>
  );
}
