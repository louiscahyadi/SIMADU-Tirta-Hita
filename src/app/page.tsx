"use client";

import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";

import RepairReportForm from "@/components/RepairReportForm";
import ServiceRequestForm from "@/components/ServiceRequestForm";
import WorkOrderForm from "@/components/WorkOrderForm";

const tabs = [
  { id: "service", label: "Permintaan Service/Perbaikan" },
  { id: "workorder", label: "Surat Perintah Kerja" },
  { id: "repair", label: "Berita Acara Perbaikan" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function HomePageInner() {
  const { data: session } = useSession();
  const role = (session as any)?.user?.role as string | undefined;
  const [active, setActive] = useState<TabId>("service");
  const [serviceRequestId, setServiceRequestId] = useState<string | undefined>();
  const [workOrderId, setWorkOrderId] = useState<string | undefined>();
  const [complaintId, setComplaintId] = useState<string | undefined>();
  const [srInitial, setSrInitial] = useState<any | undefined>(undefined);
  const sp = useSearchParams();

  // Initialize from URL query for deep-link flow
  useEffect(() => {
    const flow = sp.get("flow");
    if (flow === "service") {
      // Prefill SR from query (compatible with complaint form linking)
      setActive("service");
      setSrInitial({
        customerName: sp.get("customerName") || undefined,
        address: sp.get("address") || undefined,
        phone: sp.get("phone") || undefined,
        serviceNumber: sp.get("connectionNumber") || undefined,
        complaintCategory: sp.get("category") || undefined,
      });
      const compId = sp.get("complaintId") || undefined;
      if (compId) setComplaintId(compId);
    } else if (flow === "workorder") {
      const sr = sp.get("serviceRequestId") || undefined;
      setServiceRequestId(sr);
      setActive("workorder");
    } else if (flow === "repair") {
      const wo = sp.get("workOrderId") || undefined;
      setWorkOrderId(wo);
      setActive("repair");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If there's no flow query, show instructions to start from Pengaduan
  const hasFlow = !!(typeof window !== "undefined" && sp.get("flow"));

  return (
    <div className="space-y-4">
      {!hasFlow ? null : (
        <nav className="flex gap-2">
          {tabs.map((t) => {
            const roleAllows =
              (role === "humas" && t.id === "service") ||
              (role === "distribusi" && (t.id === "workorder" || t.id === "repair"));
            const disabledByFlow =
              (t.id === "workorder" && !serviceRequestId) || (t.id === "repair" && !workOrderId);
            const disabled = !roleAllows || disabledByFlow;
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (disabled) {
                    if (!roleAllows) {
                      alert("Akses ditolak untuk peran Anda.");
                      return;
                    }
                    if (t.id === "workorder") {
                      alert("Silakan simpan Permintaan Service terlebih dahulu.");
                    } else if (t.id === "repair") {
                      alert("Silakan simpan Surat Perintah Kerja terlebih dahulu.");
                    }
                    return;
                  }
                  setActive(t.id);
                }}
                disabled={disabled}
                className={`button !bg-gray-100 !text-gray-800 hover:!bg-blue-100 ${
                  active === t.id ? "!bg-blue-600 !text-white hover:!bg-blue-700" : ""
                } ${disabled ? "opacity-50 cursor-not-allowed hover:!bg-gray-100" : ""}`}
                aria-disabled={disabled}
                title={
                  disabled
                    ? !roleAllows
                      ? "Peran tidak diizinkan"
                      : t.id === "workorder"
                        ? "Kunci: butuh Permintaan Service"
                        : "Kunci: butuh Surat Perintah Kerja"
                    : undefined
                }
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      )}

      <div className="card p-4">
        {!hasFlow ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Alur Kerja</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-1">
              <li>Terima pengaduan dari pelanggan melalui menu Pengaduan publik.</li>
              <li>Buka Daftar Data → tab Pengaduan, lalu klik tombol Aksi pada baris pengaduan.</li>
              <li>
                Sistem akan membuka alur langkah demi langkah: Permintaan Service → SPK → BA
                Perbaikan.
              </li>
            </ol>
            <a className="btn-outline btn-sm" href="/daftar-data?tab=complaint">
              Buka Daftar Pengaduan
            </a>
          </div>
        ) : null}
        {hasFlow && active === "service" && role === "humas" && (
          <ServiceRequestForm
            initialData={srInitial}
            onSaved={(id) => {
              setServiceRequestId(id);
              const complaintId = sp.get("complaintId");
              if (complaintId) {
                // Best-effort mark complaint processed (fire-and-forget)
                fetch(`/api/complaints?id=${encodeURIComponent(complaintId)}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ serviceRequestId: id }),
                }).catch(() => {});
              }
              // HUMAS stop here and let DISTRIBUSI continue via dashboard/daftar-data
              if (role === "humas") return;
              setActive("workorder");
            }}
          />
        )}
        {hasFlow && active === "workorder" && role === "distribusi" && (
          <WorkOrderForm
            serviceRequestId={serviceRequestId}
            onSaved={(id) => {
              setWorkOrderId(id);
              if (complaintId) {
                fetch(`/api/complaints?id=${encodeURIComponent(complaintId)}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ workOrderId: id }),
                }).catch(() => {});
              }
              setActive("repair");
            }}
          />
        )}
        {hasFlow && active === "repair" && role === "distribusi" && (
          <RepairReportForm
            workOrderId={workOrderId}
            onSaved={(repairId) => {
              // selesai flow
              if (complaintId) {
                fetch(`/api/complaints?id=${encodeURIComponent(complaintId)}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ repairReportId: repairId }),
                }).catch(() => {});
              }
              setActive("service");
              setServiceRequestId(undefined);
              setWorkOrderId(undefined);
              setComplaintId(undefined);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-4">Memuat...</div>}>
      <HomePageInner />
    </Suspense>
  );
}
