import Link from "next/link";

import AutoPrintOnLoad from "@/components/AutoPrintOnLoad";
import Breadcrumbs from "@/components/Breadcrumbs";
import PrintButton from "@/components/PrintButton";
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

export default async function RepairDetail({
  params,
  searchParams,
}: PageProps & { searchParams?: Record<string, string | string[] | undefined> }) {
  const { id } = params;
  const rr = await prisma.repairReport.findUnique({ where: { id } });
  if (!rr) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Detail Berita Acara Perbaikan</h2>
        <p className="text-red-600">Data tidak ditemukan.</p>
        <Link className="text-blue-700 hover:underline" href="/daftar-data?tab=repair">
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
    select: { id: true },
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
          { label: "Daftar Data", href: "/daftar-data" },
          { label: "Berita Acara Perbaikan", href: "/daftar-data?tab=repair" },
          { label: `Berita Acara: ${rr.city ?? id}` },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Detail Berita Acara Perbaikan</h2>
        <div className="flex items-center gap-2">
          <PrintButton />
          <Link className="text-sm text-blue-700 hover:underline" href="/daftar-data?tab=repair">
            ← Kembali
          </Link>
        </div>
      </div>
      <div className="card p-4 space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Tgl Input:</span> {formatDate(rr.createdAt)}
        </div>
        <div>
          <span className="text-gray-600">Kota:</span> {rr.city ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Tim/Pelaksana:</span> {rr.team ?? rr.executorName ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Tindakan:</span> {joinJsonArray(rr.actions)}
        </div>
        <div>
          <span className="text-gray-600">Tidak Ditangani:</span>{" "}
          {joinJsonArray(rr.notHandledReasons)}
        </div>
        <div>
          <span className="text-gray-600">Disahkan Oleh:</span> {rr.authorizedBy ?? "-"}
        </div>
      </div>
      <div className="card p-4 text-sm">
        <div className="font-medium mb-2">Keterkaitan</div>
        <div className="flex items-center gap-2">
          {srEntity ? (
            <Link className="btn-outline btn-sm" href={`/daftar-data/service/${srEntity.id}`}>
              {entityLabel("serviceRequest")}
            </Link>
          ) : (
            <span className="text-gray-400">{entityLabel("serviceRequest")} -</span>
          )}
          {wo ? (
            <Link className="btn-outline btn-sm" href={`/daftar-data/workorder/${wo.id}`}>
              {entityLabel("workOrder")}
            </Link>
          ) : (
            <span className="text-gray-400">{entityLabel("workOrder")} -</span>
          )}
          <span
            className="rounded bg-green-50 px-2 py-0.5 text-green-700"
            title={entityLabel("repairReport")}
          >
            {entityAbbr("repairReport")}
          </span>
          {cFromRr ? (
            <Link className="btn-outline btn-sm" href={`/daftar-data/complaint/${cFromRr.id}`}>
              Complaint
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
