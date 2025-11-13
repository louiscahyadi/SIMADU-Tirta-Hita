import Link from "next/link";

import AutoPrintOnLoad from "@/components/AutoPrintOnLoad";
import Breadcrumbs from "@/components/Breadcrumbs";
import OfficialPrintButton from "@/components/print/OfficialPrintButton";
import PrintButton from "@/components/PrintButton";
import StatusHistoryPanel from "@/components/StatusHistoryPanel";
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

export default async function ComplaintDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const scope = (() => {
    const v = searchParams?.["scope"];
    return Array.isArray(v) ? v[0] : v;
  })()?.toLowerCase?.();
  const listBase = scope === "humas" ? "/humas/daftar-data" : "/daftar-data";
  const c = await (prisma as any).complaint.findUnique({
    where: { id: params.id },
    include: { histories: { orderBy: { createdAt: "asc" } } },
  });
  if (!c) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Detail Pengaduan</h2>
        <p className="text-red-600">Data tidak ditemukan.</p>
        <Link className="text-blue-700 hover:underline" href={`${listBase}?tab=complaint`}>
          ← Kembali
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(() => {
        const sp = searchParams ?? {};
        const v = Array.isArray(sp["print"]) ? sp["print"][0] : sp["print"];
        return v === "1" ? <AutoPrintOnLoad /> : null;
      })()}
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          scope === "humas"
            ? { label: "Daftar Data (HUMAS)", href: "/humas/daftar-data" }
            : { label: "Daftar Data", href: "/daftar-data" },
          { label: "Pengaduan Pelanggan", href: `${listBase}?tab=complaint` },
          { label: `Pengaduan: ${c.customerName ?? params.id}` },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Detail Pengaduan</h2>
        <div className="flex items-center gap-2">
          <OfficialPrintButton documentType="complaint" documentId={params.id} />
          <PrintButton />
          <Link
            className="text-sm text-blue-700 hover:underline"
            href={`${listBase}?tab=complaint`}
          >
            ← Kembali
          </Link>
        </div>
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
      {(c.serviceRequestId || c.workOrderId || c.repairReportId) && (
        <div className="card p-4 text-sm">
          <div className="font-medium mb-2">Dokumen Terkait</div>
          <div className="flex items-center gap-2">
            {c.serviceRequestId && (
              <Link
                className="btn-outline btn-sm"
                href={`/daftar-data/service/${c.serviceRequestId}`}
              >
                Permintaan Service
              </Link>
            )}
            {c.workOrderId && (
              <Link className="btn-outline btn-sm" href={`/daftar-data/workorder/${c.workOrderId}`}>
                Surat Perintah Kerja
              </Link>
            )}
            {c.repairReportId && (
              <Link className="btn-outline btn-sm" href={`/daftar-data/repair/${c.repairReportId}`}>
                Berita Acara
              </Link>
            )}
          </div>
        </div>
      )}
      <StatusHistoryPanel items={(c as any).histories} currentStatus={(c as any).status} />
    </div>
  );
}
