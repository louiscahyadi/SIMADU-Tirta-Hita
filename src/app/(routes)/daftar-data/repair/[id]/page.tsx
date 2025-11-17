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

function joinJsonArray(value: any) {
  if (!value) return "-";
  try {
    const parsed = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? JSON.parse(value)
        : [];
    if (Array.isArray(parsed))
      return parsed.filter((v) => typeof v === "string" && v.trim().length).join(", ") || "-";
  } catch {}
  return "-";
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

function formatDuration(start?: Date | string | null, end?: Date | string | null) {
  if (!start || !end) return "-";
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  const ms = e.getTime() - s.getTime();
  if (!isFinite(ms) || ms < 0) return "-";
  const minutes = Math.floor(ms / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
}

export default async function RepairDetail({
  params,
  searchParams,
}: PageProps & { searchParams?: Record<string, string | string[] | undefined> }) {
  const { id } = params;
  const scope = (() => {
    const v = searchParams?.["scope"];
    return Array.isArray(v) ? v[0] : v;
  })()?.toLowerCase?.();
  const listBase = scope === "humas" ? "/humas/daftar-data" : "/daftar-data";
  const rr = await prisma.repairReport.findUnique({ where: { id } });
  if (!rr) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Detail Berita Acara Perbaikan</h2>
        <p className="text-red-600">Data tidak ditemukan.</p>
        <Link className="text-blue-700 hover:underline" href={`${listBase}?tab=repair`}>
          ← Kembali ke daftar
        </Link>
      </div>
    );
  }

  const rrWithWo = await (prisma as any).repairReport.findUnique({
    where: { id },
    select: { workOrderId: true },
  });
  const wo = rrWithWo?.workOrderId
    ? await prisma.workOrder.findUnique({
        where: { id: rrWithWo.workOrderId as string },
      })
    : null;
  const sr = wo
    ? await (prisma as any).workOrder.findUnique({
        where: { id: wo.id },
        select: { serviceRequestId: true },
      })
    : null;
  const srEntity = sr?.serviceRequestId
    ? await prisma.serviceRequest.findUnique({
        where: { id: sr.serviceRequestId as string },
      })
    : null;
  const cFromRr = await (prisma as any).complaint.findFirst({
    where: { repairReportId: id },
    select: { id: true, status: true, histories: { orderBy: { createdAt: "asc" } } },
  });

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
          { label: "Berita Acara Perbaikan", href: `${listBase}?tab=repair` },
          { label: `Berita Acara: ${(rr as any).result ?? rr.city ?? id}` },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Detail Berita Acara Perbaikan</h2>
        <div className="flex items-center gap-2">
          <Link className="text-sm text-blue-700 hover:underline" href={`${listBase}?tab=repair`}>
            ← Kembali
          </Link>
        </div>
      </div>
      <div className="card p-4 space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Tgl Input:</span> {formatDate(rr.createdAt)}
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          <div>
            <span className="text-gray-600">Waktu Mulai:</span> {formatDate((rr as any).startTime)}
          </div>
          <div>
            <span className="text-gray-600">Waktu Selesai:</span> {formatDate((rr as any).endTime)}
          </div>
        </div>
        <div>
          <span className="text-gray-600">Durasi:</span>{" "}
          {formatDuration((rr as any).startTime, (rr as any).endTime)}
        </div>
        <div>
          <span className="text-gray-600">Hasil:</span>{" "}
          {(() => {
            const res = ((rr as any).result as string | undefined) ?? undefined;
            if (!res) return "-";
            const cls =
              res === "FIXED"
                ? "bg-green-50 text-green-700"
                : res === "MONITORING"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"; // NOT_FIXED or others
            return (
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
                {res}
              </span>
            );
          })()}
        </div>
        <div>
          <span className="text-gray-600">Tindakan Perbaikan:</span>{" "}
          {(rr as any).actionTaken?.trim?.() || joinJsonArray((rr as any).actions)}
        </div>

        {/* Legacy/opsional info for data lama */}
        {(rr.city || rr.team || rr.executorName || rr.authorizedBy || rr.cityDate) && (
          <div className="mt-2 pt-2 border-t border-gray-100 grid md:grid-cols-2 gap-2">
            {rr.city ? (
              <div>
                <span className="text-gray-600">Kota:</span> {rr.city}
              </div>
            ) : null}
            {rr.cityDate ? (
              <div>
                <span className="text-gray-600">Tgl Kota:</span> {formatDate(rr.cityDate)}
              </div>
            ) : null}
            {rr.team || rr.executorName ? (
              <div className="md:col-span-2">
                <span className="text-gray-600">Tim/Pelaksana:</span> {rr.team ?? rr.executorName}
              </div>
            ) : null}
            {rr.authorizedBy ? (
              <div className="md:col-span-2">
                <span className="text-gray-600">Disahkan Oleh:</span> {rr.authorizedBy}
              </div>
            ) : null}
            {Array.isArray((rr as any).notHandledReasons) &&
            (rr as any).notHandledReasons?.length ? (
              <div className="md:col-span-2">
                <span className="text-gray-600">Tidak Ditangani:</span>{" "}
                {joinJsonArray((rr as any).notHandledReasons)}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Tanda Tangan Digital */}
      {(rr as any).executorSignature && (
        <div className="card p-4">
          <div className="font-medium mb-3 text-blue-900">Tanda Tangan Digital</div>
          <div className="space-y-3">
            <div className="max-w-xs">
              <div className="text-sm text-gray-600 mb-2">Pelaksana Perbaikan:</div>
              <div className="border rounded-lg p-2 bg-gray-50 relative h-24">
                <Image
                  src={(rr as any).executorSignature}
                  alt="Tanda tangan pelaksana perbaikan"
                  fill
                  className="object-contain"
                  sizes="(max-width: 320px) 280px, 320px"
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                <div>Ditandatangani oleh: {(rr as any).executorSignedBy || "Unknown"}</div>
                <div>Waktu: {formatDate((rr as any).executorSignedAt)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print-friendly summary section */}
      <div
        className="card p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200"
        id="print-section"
      >
        <div className="flex items-center justify-between mb-3 print-hide">
          <div className="font-medium text-green-900 flex items-center gap-2">
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
          <h1 className="text-3xl font-bold uppercase tracking-wider mb-6">
            FORMULIR BERITA ACARA PERBAIKAN
          </h1>
        </div>

        <div className="bg-white p-6 rounded border">
          <div className="space-y-4">
            {/* Header Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium text-gray-700">Tanggal Input:</span>
                  <span className="font-semibold">{formatDate(rr.createdAt)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium text-gray-700">Kota:</span>
                  <span className="font-semibold">{rr.city || "-"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium text-gray-700">Waktu Mulai:</span>
                  <span className="font-semibold">{formatDate((rr as any).startTime)}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium text-gray-700">Waktu Selesai:</span>
                  <span className="font-semibold">{formatDate((rr as any).endTime)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium text-gray-700">Durasi:</span>
                  <span className="font-semibold">
                    {formatDuration((rr as any).startTime, (rr as any).endTime)}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium text-gray-700">Tim/Pelaksana:</span>
                  <span className="font-semibold">{rr.team ?? rr.executorName ?? "-"}</span>
                </div>
              </div>
            </div>

            {/* Hasil dan Tindakan Perbaikan */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-col space-y-2 mb-4">
                <span className="font-medium text-gray-700">Hasil Perbaikan:</span>
                <div className="bg-gray-50 p-3 rounded">
                  {(() => {
                    const res = ((rr as any).result as string | undefined) ?? undefined;
                    if (!res) return "-";
                    return (
                      <span
                        className={`inline-block rounded px-3 py-1 text-sm font-medium ${
                          res === "FIXED"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {res}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <span className="font-medium text-gray-700">Tindakan Perbaikan:</span>
                <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
                  <span className="text-gray-800">
                    {(rr as any).actionTaken?.trim?.() || joinJsonArray((rr as any).actions) || "-"}
                  </span>
                </div>
              </div>
            </div>
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
                {(rr as any).executorSignature && (
                  <div className="w-20 h-12">
                    <Image
                      src={(rr as any).executorSignature as string}
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
        <div className="mt-3 text-xs text-green-700 print-hide">
          💡 Informasi di atas siap untuk keperluan print/cetak dokumen resmi
        </div>
      </div>

      {cFromRr ? (
        <StatusHistoryPanel
          items={(cFromRr as any).histories}
          currentStatus={(cFromRr as any).status}
        />
      ) : null}
    </div>
  );
}
