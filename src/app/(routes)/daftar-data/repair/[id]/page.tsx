import Image from "next/image";
import Link from "next/link";

import AutoPrintOnLoad from "@/components/AutoPrintOnLoad";
import Breadcrumbs from "@/components/Breadcrumbs";
import PrintButton from "@/components/PrintButton";
import StatusHistoryPanel from "@/components/StatusHistoryPanel";
import { prisma } from "@/lib/prisma";
import { entityAbbr, entityLabel } from "@/lib/uiLabels";

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
          <PrintButton />
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
        <div>
          <span className="text-gray-600">Catatan Akhir:</span> {(rr as any).remarks ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Yang Menerima:</span>{" "}
          {(rr as any).customerConfirmationName ?? "-"}
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
        <div className="card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm font-medium">✍️</span>
            </div>
            <h3 className="font-medium text-gray-800">Tanda Tangan Digital</h3>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Tanda Tangan Pelaksana */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Pelaksana Perbaikan:</div>
                <div className="relative w-full h-32 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                  <Image
                    src={(rr as any).executorSignature}
                    alt="Tanda Tangan Pelaksana"
                    fill
                    className="object-contain p-2"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <div className="text-xs text-gray-600 mt-2 space-y-1">
                  <div>
                    <span className="font-medium">Ditandatangani oleh:</span>{" "}
                    {(rr as any).executorSignedBy || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Waktu:</span>{" "}
                    {formatDate((rr as any).executorSignedAt)}
                  </div>
                </div>
              </div>

              {/* Info Tambahan */}
              <div className="flex flex-col justify-center">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div className="text-xs text-blue-700 space-y-1">
                    <div className="font-medium">🔒 Keamanan Tanda Tangan:</div>
                    <div>• Tanda tangan tersimpan dengan aman dalam sistem</div>
                    <div>• Timestamp otomatis untuk audit trail</div>
                    <div>• Data tidak dapat diubah setelah disimpan</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(srEntity || wo || cFromRr) && (
        <div className="card p-4 text-sm">
          <div className="font-medium mb-2">Dokumen Terkait</div>
          <div className="flex items-center gap-2">
            {srEntity && (
              <Link className="btn-outline btn-sm" href={`/daftar-data/service/${srEntity.id}`}>
                {entityLabel("serviceRequest")}
              </Link>
            )}
            {wo && (
              <Link className="btn-outline btn-sm" href={`/daftar-data/workorder/${wo.id}`}>
                {entityLabel("workOrder")}
              </Link>
            )}
            <span
              className="rounded bg-green-50 px-2 py-0.5 text-green-700"
              title={entityLabel("repairReport")}
            >
              {entityAbbr("repairReport")}
            </span>
            {cFromRr && (
              <Link className="btn-outline btn-sm" href={`/daftar-data/complaint/${cFromRr.id}`}>
                Complaint
              </Link>
            )}
          </div>
        </div>
      )}
      {cFromRr ? (
        <StatusHistoryPanel
          items={(cFromRr as any).histories}
          currentStatus={(cFromRr as any).status}
        />
      ) : null}
    </div>
  );
}
