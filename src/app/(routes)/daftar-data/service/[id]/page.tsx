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

export default async function ServiceDetail({
  params,
  searchParams,
}: PageProps & { searchParams?: Record<string, string | string[] | undefined> }) {
  const { id } = params;
  const scope = (() => {
    const v = searchParams?.["scope"];
    return Array.isArray(v) ? v[0] : v;
  })()?.toLowerCase?.();
  const listBase = scope === "humas" ? "/humas/daftar-data" : "/daftar-data";
  const service = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!service) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Detail Permintaan Service</h2>
        <p className="text-red-600">Data tidak ditemukan.</p>
        <Link className="text-blue-700 hover:underline" href={`${listBase}?tab=service`}>
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
  const complaint = await (prisma as any).complaint.findFirst({
    where: { serviceRequestId: id },
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
          { label: "Permintaan Service", href: `${listBase}?tab=service` },
          {
            label: `Permintaan Service: ${
              (service as any).reporterName ?? service.customerName ?? id
            }`,
          },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Detail Permintaan Service</h2>
        <div className="flex items-center gap-2">
          <PrintButton />
          <Link className="text-sm text-blue-700 hover:underline" href={`${listBase}?tab=service`}>
            ← Kembali
          </Link>
        </div>
      </div>
      {/* PSP primary details */}
      <div className="card p-4 space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Diterima:</span>{" "}
          {(() => {
            const ra = (service as any).receivedAt as Date | string | undefined;
            if (!ra) return "-";
            return formatDate(ra);
          })()}
          {((service as any).receivedBy as string | undefined)?.trim?.() ? (
            <span className="ml-2 text-gray-600">
              {" "}
              | Petugas Jaga: {(service as any).receivedBy}
            </span>
          ) : null}
        </div>
        <div>
          <span className="text-gray-600">No. Pelanggan (No. SL):</span>{" "}
          {service.serviceNumber ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Nama Pelanggan:</span>{" "}
          {(service as any).reporterName ?? service.customerName}
        </div>
        <div>
          <span className="text-gray-600">No. Kontak:</span>{" "}
          {(service as any).reporterPhone ?? service.phone ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Alamat/Lokasi:</span> {service.address}
        </div>
        <div>
          <span className="text-gray-600">Alasan:</span> {joinJsonArray((service as any).reasons)}
        </div>
        <div>
          <span className="text-gray-600">Lain-lain:</span>{" "}
          {((service as any).otherReason as string | undefined)?.trim?.() || "-"}
        </div>
        <div>
          <span className="text-gray-600">Biaya ditanggung oleh:</span>{" "}
          {((service as any).serviceCostBy as string | undefined) ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Keterangan Tambahan:</span>{" "}
          {((service as any).description as string | undefined) ?? "-"}
        </div>
      </div>

      {/* Legacy/operational details retained for completeness */}
      <div className="card p-4 space-y-2 text-sm">
        <div className="font-medium mb-1">Detail Tambahan</div>
        <div>
          <span className="text-gray-600">Tgl Input:</span> {formatDate(service.createdAt)}
        </div>
        {/* No. SL, Alasan sudah ditampilkan di bagian utama */}
        <div>
          <span className="text-gray-600">Tindakan (opsional):</span> {service.actionTaken ?? "-"}
        </div>
      </div>
      {(wo || rr) && (
        <div className="card p-4 text-sm">
          <div className="font-medium mb-2">Dokumen Terkait</div>
          <div className="flex items-center gap-2">
            <span
              className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700"
              title={entityLabel("serviceRequest")}
            >
              {entityAbbr("serviceRequest")}
            </span>
            {wo && (
              <Link className="btn-outline btn-sm" href={`/daftar-data/workorder/${wo.id}`}>
                {entityLabel("workOrder")}
              </Link>
            )}
            {rr && (
              <Link className="btn-outline btn-sm" href={`/daftar-data/repair/${rr.id}`}>
                {entityLabel("repairReport")}
              </Link>
            )}
          </div>
        </div>
      )}
      {complaint ? (
        <StatusHistoryPanel
          items={(complaint as any).histories}
          currentStatus={(complaint as any).status}
        />
      ) : null}
    </div>
  );
}
