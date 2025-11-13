import Image from "next/image";
import Link from "next/link";

import AutoPrintOnLoad from "@/components/AutoPrintOnLoad";
import Breadcrumbs from "@/components/Breadcrumbs";
import OfficialPrintButton from "@/components/print/OfficialPrintButton";
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
          { label: "Surat Perintah Kerja", href: `${listBase}?tab=workorder` },
          { label: `Surat Perintah Kerja: ${wo.number ?? id}` },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Detail Surat Perintah Kerja</h2>
        <div className="flex items-center gap-2">
          <OfficialPrintButton documentType="workorder" documentId={id} />
          <PrintButton />
          <Link
            className="text-sm text-blue-700 hover:underline"
            href={`${listBase}?tab=workorder`}
          >
            ← Kembali
          </Link>
        </div>
      </div>
      <div className="card p-4 space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Tgl Input:</span> {formatDate(wo.createdAt)}
        </div>
        <div>
          <span className="text-gray-600">No:</span> {wo.number ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Tim/Unit:</span> {wo.team ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Teknisi:</span>{" "}
          {((wo as any).technicians as string) ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Jadwal:</span> {formatDate((wo as any).scheduledDate)}
        </div>
        <div>
          <span className="text-gray-600">Instruksi:</span>{" "}
          {((wo as any).instructions as string) ?? "-"}
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
      {(sr || rr || cFromWo) && (
        <div className="card p-4 text-sm">
          <div className="font-medium mb-2">Dokumen Terkait</div>
          <div className="flex items-center gap-2">
            {sr && (
              <Link className="btn-outline btn-sm" href={`/daftar-data/service/${sr.id}`}>
                {entityLabel("serviceRequest")}
              </Link>
            )}
            <span
              className="rounded bg-blue-50 px-2 py-0.5 text-blue-700"
              title={entityLabel("workOrder")}
            >
              {entityAbbr("workOrder")}
            </span>
            {rr && (
              <Link className="btn-outline btn-sm" href={`/daftar-data/repair/${rr.id}`}>
                {entityLabel("repairReport")}
              </Link>
            )}
            {cFromWo && (
              <Link className="btn-outline btn-sm" href={`/daftar-data/complaint/${cFromWo.id}`}>
                Complaint
              </Link>
            )}
          </div>
        </div>
      )}
      {cFromWo ? (
        <StatusHistoryPanel
          items={(cFromWo as any).histories}
          currentStatus={(cFromWo as any).status}
        />
      ) : null}
    </div>
  );
}
