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
          { label: "Daftar Data", href: "/daftar-data" },
          { label: "Permintaan Service", href: "/daftar-data?tab=service" },
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
          <Link className="text-sm text-blue-700 hover:underline" href="/daftar-data?tab=service">
            ← Kembali
          </Link>
        </div>
      </div>
      {/* PSP primary details */}
      <div className="card p-4 space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Tgl Permintaan:</span>{" "}
          {formatDate((service as any).requestDate ?? service.createdAt)}
        </div>
        <div>
          <span className="text-gray-600">Nama Pelapor:</span>{" "}
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
          <span className="text-gray-600">Urgensi:</span>{" "}
          {(() => {
            const u = ((service as any).urgency as string | undefined) ?? undefined;
            if (!u) return "-";
            const cls =
              u === "HIGH"
                ? "bg-red-50 text-red-700"
                : u === "MEDIUM"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-green-50 text-green-700"; // LOW
            return (
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
                {u}
              </span>
            );
          })()}
        </div>
        <div>
          <span className="text-gray-600">Deskripsi/Keluhan:</span>{" "}
          {(service as any).description ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Catatan Tambahan:</span> {(service as any).notes ?? "-"}
        </div>
      </div>

      {/* Legacy/operational details retained for completeness */}
      <div className="card p-4 space-y-2 text-sm">
        <div className="font-medium mb-1">Detail Tambahan</div>
        <div>
          <span className="text-gray-600">Tgl Input:</span> {formatDate(service.createdAt)}
        </div>
        <div>
          <span className="text-gray-600">No. SL:</span> {service.serviceNumber ?? "-"}
        </div>
        <div>
          <span className="text-gray-600">Alasan (opsional):</span> {joinJsonArray(service.reasons)}
        </div>
        <div>
          <span className="text-gray-600">Tindakan (opsional):</span> {service.actionTaken ?? "-"}
        </div>
      </div>
      <div className="card p-4 text-sm">
        <div className="font-medium mb-2">Keterkaitan</div>
        <div className="flex items-center gap-2">
          <span
            className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700"
            title={entityLabel("serviceRequest")}
          >
            {entityAbbr("serviceRequest")}
          </span>
          {wo ? (
            <Link className="btn-outline btn-sm" href={`/daftar-data/workorder/${wo.id}`}>
              {entityLabel("workOrder")}
            </Link>
          ) : (
            <span className="text-gray-400">{entityLabel("workOrder")} -</span>
          )}
          {rr ? (
            <Link className="btn-outline btn-sm" href={`/daftar-data/repair/${rr.id}`}>
              {entityLabel("repairReport")}
            </Link>
          ) : (
            <span className="text-gray-400">{entityLabel("repairReport")} -</span>
          )}
        </div>
      </div>
      {complaint ? (
        <StatusHistoryPanel
          items={(complaint as any).histories}
          currentStatus={(complaint as any).status}
        />
      ) : null}
    </div>
  );
}
