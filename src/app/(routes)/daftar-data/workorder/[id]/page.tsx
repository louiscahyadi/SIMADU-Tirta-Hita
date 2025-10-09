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

export default async function WorkOrderDetail({ params }: PageProps) {
  const { id } = params;
  const wo = await prisma.workOrder.findUnique({ where: { id } });
  if (!wo) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Detail Surat Perintah Kerja</h2>
        <p className="text-red-600">Data tidak ditemukan.</p>
        <Link className="text-blue-700 hover:underline" href="/daftar-data?tab=workorder">
          ← Kembali ke daftar
        </Link>
      </div>
    );
  }

  const woWithSr = await (prisma as any).workOrder.findUnique({
    where: { id },
    select: { serviceRequestId: true },
  });
  const sr = woWithSr?.serviceRequestId
    ? await prisma.serviceRequest.findUnique({
        where: { id: woWithSr.serviceRequestId as string },
      })
    : null;
  const rr = await (prisma as any).repairReport.findFirst({
    where: { workOrderId: id },
  });
  const cFromWo = await (prisma as any).complaint.findFirst({
    where: { workOrderId: id },
    select: { id: true },
  });

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "Daftar Data", href: "/daftar-data" },
          { label: "Surat Perintah Kerja", href: "/daftar-data?tab=workorder" },
          { label: `Surat Perintah Kerja: ${wo.number ?? id}` },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Detail Surat Perintah Kerja</h2>
        <Link className="text-sm text-blue-700 hover:underline" href="/daftar-data?tab=workorder">
          ← Kembali
        </Link>
      </div>
      <div className="card p-4 space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Tgl Input:</span> {formatDate(wo.createdAt)}
        </div>
        <div>
          <span className="text-gray-600">No:</span> {wo.number ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Pelapor:</span> {wo.reporterName ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Lokasi:</span> {wo.disturbanceLocation ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Jenis:</span> {wo.disturbanceType ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Tim/Pelaksana:</span> {wo.team ?? wo.executorName ?? "-"}
        </div>
      </div>
      <div className="card p-4 text-sm">
        <div className="font-medium mb-2">Keterkaitan</div>
        <div className="flex items-center gap-2">
          {sr ? (
            <Link className="btn-outline btn-sm" href={`/daftar-data/service/${sr.id}`}>
              Permintaan Service
            </Link>
          ) : (
            <span className="text-gray-400">Permintaan Service -</span>
          )}
          <span className="btn-outline btn-sm">Surat Perintah Kerja</span>
          {rr ? (
            <Link className="btn-outline btn-sm" href={`/daftar-data/repair/${rr.id}`}>
              Berita Acara
            </Link>
          ) : (
            <span className="text-gray-400">Berita Acara -</span>
          )}
          {cFromWo ? (
            <Link className="btn-outline btn-sm" href={`/daftar-data/complaint/${cFromWo.id}`}>
              Complaint
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
