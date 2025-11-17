import Image from "next/image";
import Link from "next/link";

import AutoPrintOnLoad from "@/components/AutoPrintOnLoad";
import Breadcrumbs from "@/components/Breadcrumbs";
import ClientPrintButton from "@/components/ClientPrintButton";
import StatusHistoryPanel from "@/components/StatusHistoryPanel";
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

function formatDateOnly(d?: Date | string | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "long",
    }).format(dt);
  } catch {
    return dt.toISOString().split("T")[0];
  }
}

export default async function WorkOrderDetail({
  params,
  searchParams,
}: PageProps & { searchParams?: Record<string, string | string[] | undefined> }) {
  const { id } = params;
  const scope = (() => {
    const v = searchParams?.["scope"];
    return Array.isArray(v) ? v[0] : v;
  })()?.toLowerCase?.();
  const listBase = scope === "humas" ? "/humas/daftar-data" : "/daftar-data";
  const wo = await prisma.workOrder.findUnique({ where: { id } });
  if (!wo) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Detail Surat Perintah Kerja</h2>
        <p className="text-red-600">Data tidak ditemukan.</p>
        <Link className="text-blue-700 hover:underline" href={`${listBase}?tab=workorder`}>
          ← Kembali ke daftar
        </Link>
      </div>
    );
  }

  // Fetch related data for complete information
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
    select: {
      id: true,
      status: true,
      category: true,
      customerName: true,
      address: true,
      histories: { orderBy: { createdAt: "asc" } },
    },
  });

  // Create combined data for display with fallbacks
  const displayData = {
    reportDate: (wo as any).reportDate || wo.createdAt,
    number: wo.number,
    reporterName: wo.reporterName || sr?.reporterName || sr?.customerName || cFromWo?.customerName,
    disturbanceLocation: wo.disturbanceLocation || sr?.address || cFromWo?.address,
    disturbanceType: wo.disturbanceType || cFromWo?.category,
    handledDate: (wo as any).handledDate,
    handlingTime: (wo as any).handlingTime,
    team: wo.team,
    technicians: (wo as any).technicians,
    scheduledDate: (wo as any).scheduledDate,
    instructions: (wo as any).instructions,
    createdAt: wo.createdAt,
  };

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
          { label: "Surat Perintah Kerja", href: `${listBase}?tab=workorder` },
          { label: `Surat Perintah Kerja: ${wo.number ?? id}` },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Detail Surat Perintah Kerja</h2>
        <div className="flex items-center gap-2">
          <Link
            className="text-sm text-blue-700 hover:underline"
            href={`${listBase}?tab=workorder`}
          >
            ← Kembali
          </Link>
        </div>
      </div>
      <div className="card p-4">
        <div className="font-medium mb-3 text-lg text-blue-900">Informasi Surat Perintah Kerja</div>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div className="flex flex-col">
              <span className="text-gray-600 font-medium">Lap. Hari/Tanggal:</span>
              <span className="text-base font-semibold text-gray-900">
                {formatDate(displayData.reportDate)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 font-medium">No:</span>
              <span className="text-base font-semibold text-gray-900">
                {displayData.number || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 font-medium">Nama Pelapor:</span>
              <span className="text-base font-semibold text-gray-900">
                {displayData.reporterName || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 font-medium">Lokasi Gangguan:</span>
              <span className="text-base font-semibold text-gray-900">
                {displayData.disturbanceLocation || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 font-medium">Jenis Gangguan:</span>
              <span className="text-base font-semibold text-gray-900">
                {displayData.disturbanceType || "-"}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col">
              <span className="text-gray-600 font-medium">Hari/Tanggal Ditangani:</span>
              <span className="text-base font-semibold text-gray-900">
                {formatDate(displayData.handledDate)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 font-medium">Waktu Penanganan:</span>
              <span className="text-base font-semibold text-gray-900">
                {displayData.handlingTime || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 font-medium">Tim/Unit Pelaksana:</span>
              <span className="text-base font-semibold text-gray-900">
                {displayData.team || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 font-medium">Teknisi:</span>
              <span className="text-base font-semibold text-gray-900">
                {displayData.technicians || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 font-medium">Jadwal Pekerjaan:</span>
              <span className="text-base font-semibold text-gray-900">
                {formatDate(displayData.scheduledDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="font-medium mb-3 text-gray-700">Informasi Sistem</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Tgl Input Sistem:</span>
              <span className="font-medium">{formatDate(displayData.createdAt)}</span>
            </div>
          </div>

          {displayData.instructions && (
            <div className="mt-4">
              <span className="text-gray-600 font-medium">Instruksi Khusus:</span>
              <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-400 rounded text-sm">
                {displayData.instructions}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Digital Signature Section */}
      {((wo as any).creatorSignature as string) && (
        <div className="card p-4">
          <div className="font-medium mb-3 text-blue-900">Tanda Tangan Digital</div>
          <div className="space-y-3">
            <div className="max-w-xs">
              <div className="text-sm text-gray-600 mb-2">Pembuat SPK:</div>
              <div className="border rounded-lg p-2 bg-gray-50 relative h-24">
                <Image
                  src={(wo as any).creatorSignature as string}
                  alt="Tanda tangan pembuat SPK"
                  fill
                  className="object-contain"
                  sizes="(max-width: 320px) 280px, 320px"
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                <div>
                  Ditandatangani oleh: {((wo as any).creatorSignedBy as string) ?? "Unknown"}
                </div>
                <div>Waktu: {formatDate((wo as any).creatorSignedAt)}</div>
              </div>
            </div>

            {((wo as any).supervisorSignature as string) && (
              <div className="max-w-xs">
                <div className="text-sm text-gray-600 mb-2">Supervisor:</div>
                <div className="border rounded-lg p-2 bg-gray-50 relative h-24">
                  <Image
                    src={(wo as any).supervisorSignature as string}
                    alt="Tanda tangan supervisor"
                    fill
                    className="object-contain"
                    sizes="(max-width: 320px) 280px, 320px"
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  <div>
                    Ditandatangani oleh: {((wo as any).supervisorSignedBy as string) ?? "Unknown"}
                  </div>
                  <div>Waktu: {formatDate((wo as any).supervisorSignedAt)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Print-friendly summary section */}
      <div
        className="card p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
        id="print-section"
      >
        <div className="flex items-center justify-between mb-3 print-hide">
          <div className="font-medium text-blue-900 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Ringkasan untuk Print/Cetak
          </div>
          <ClientPrintButton />
        </div>
        {/* Judul untuk Print - Ditempatkan di atas seluruh konten */}
        <div className="text-center mb-8 print-only">
          <h1 className="text-3xl font-bold uppercase tracking-wider mb-6">SURAT PERINTAH KERJA</h1>
        </div>

        <div className="bg-white p-6 rounded border">
          <div className="space-y-4">
            {/* Header Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium text-gray-700">Laporan Hari/Tanggal:</span>
                  <span className="font-semibold">{formatDateOnly(displayData.reportDate)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium text-gray-700">No:</span>
                  <span className="font-semibold">{displayData.number || "09"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium text-gray-700">Nama Pelapor:</span>
                  <span className="font-semibold">{displayData.reporterName || "-"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium text-gray-700">Lokasi Gangguan:</span>
                  <span className="font-semibold">{displayData.disturbanceLocation || "-"}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium text-gray-700">Jenis Gangguan:</span>
                  <span className="font-semibold">{displayData.disturbanceType || "-"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium text-gray-700">Hari/Tanggal Ditangani:</span>
                  <span className="font-semibold">{formatDateOnly(displayData.handledDate)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium text-gray-700">Waktu Penanganan:</span>
                  <span className="font-semibold">{displayData.handlingTime || "-"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium text-gray-700">Tim/Unit:</span>
                  <span className="font-semibold">{displayData.team || "-"}</span>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            {displayData.technicians && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-col space-y-2">
                  <span className="font-medium text-gray-700">Teknisi:</span>
                  <span className="font-semibold bg-gray-50 p-3 rounded">
                    {displayData.technicians}
                  </span>
                </div>
              </div>
            )}
            {displayData.instructions && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-col space-y-2">
                  <span className="font-medium text-gray-700">Instruksi Khusus:</span>
                  <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
                    <span className="text-gray-800">{displayData.instructions}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Digital Signatures for Print - Official Format */}
        <div className="mt-8 p-6 bg-white border rounded">
          <div className="flex justify-end">
            <div className="text-center">
              {/* Tempat dan tanggal */}
              <div className="mb-6">
                <span className="text-sm font-medium">Singaraja, {formatDateOnly(new Date())}</span>
              </div>

              {/* Space untuk tanda tangan */}
              <div className="h-20 mb-6 flex items-center justify-center">
                {(wo as any).creatorSignature && (
                  <div className="w-20 h-12">
                    <Image
                      src={(wo as any).creatorSignature as string}
                      alt="Tanda tangan"
                      width={80}
                      height={48}
                      className="object-contain w-full h-full"
                    />
                  </div>
                )}
              </div>

              {/* Jabatan */}
              <div className="text-sm font-medium">Ka. Sub. Bag. Distribusi</div>
            </div>
          </div>
        </div>
        {/* Status indikator untuk field yang kosong */}
        {(!displayData.reporterName ||
          !displayData.disturbanceLocation ||
          !displayData.disturbanceType) && (
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs print-hide">
            <div className="font-medium text-amber-800 mb-1">⚠️ Informasi Belum Lengkap:</div>
            <div className="text-amber-700">
              {!displayData.reporterName && "• Nama Pelapor belum diisi\n"}
              {!displayData.disturbanceLocation && "• Lokasi Gangguan belum diisi\n"}
              {!displayData.disturbanceType && "• Jenis Gangguan belum diisi\n"}
            </div>
            <div className="text-amber-600 mt-1">
              Data akan diisi otomatis dari PSP/Pengaduan yang terkait saat SPK dibuat.
            </div>
          </div>
        )}
        <div className="mt-3 text-xs text-blue-700 print-hide">
          💡 Informasi di atas siap untuk keperluan print/cetak dokumen resmi
        </div>
      </div>

      {cFromWo ? (
        <StatusHistoryPanel
          items={(cFromWo as any).histories}
          currentStatus={(cFromWo as any).status}
        />
      ) : null}
    </div>
  );
}
