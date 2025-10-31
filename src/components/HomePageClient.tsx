"use client";

import { useState } from "react";

import RepairReportForm from "@/components/RepairReportForm";
import ServiceRequestForm from "@/components/ServiceRequestForm";
import WorkOrderForm from "@/components/WorkOrderForm";

const tabs = [
  { id: "service", label: "Permintaan Service/Perbaikan" },
  { id: "workorder", label: "Surat Perintah Kerja" },
  { id: "repair", label: "Berita Acara Perbaikan" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type Role = "humas" | "distribusi" | string | undefined;

export default function HomePageClient({
  role,
  initialFlow,
  initialComplaintId,
  initialServiceRequestId,
  initialWorkOrderId,
  srInitial,
  errors = [],
}: {
  role?: Role;
  initialFlow: TabId;
  initialComplaintId?: string;
  initialServiceRequestId?: string;
  initialWorkOrderId?: string;
  srInitial?: {
    reporterName?: string;
    address?: string;
    reporterPhone?: string;
    serviceNumber?: string;
  };
  errors?: string[];
}) {
  const [active, setActive] = useState<TabId>(initialFlow);
  const [serviceRequestId, setServiceRequestId] = useState<string | undefined>(
    initialServiceRequestId,
  );
  const [workOrderId, setWorkOrderId] = useState<string | undefined>(initialWorkOrderId);
  const [complaintId, setComplaintId] = useState<string | undefined>(initialComplaintId);

  return (
    <div className="space-y-4">
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
                    alert(
                      "Berita Acara hanya dapat dibuat setelah SPK selesai dikerjakan di lapangan. Gunakan dashboard Distribusi untuk membuat BA dari SPK yang sudah selesai.",
                    );
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
                      : "Kunci: butuh SPK yang telah selesai dikerjakan di lapangan"
                  : undefined
              }
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {errors.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <div className="font-medium">Ada masalah pada parameter URL:</div>
          <ul className="mt-1 list-disc list-inside space-y-0.5">
            {errors.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card p-4">
        {active === "service" && role === "humas" && (
          <ServiceRequestForm
            initialData={{ ...srInitial, caseId: complaintId }}
            caseId={complaintId}
            onSaved={(id) => {
              setServiceRequestId(id);
              // HUMAS stop here and let DISTRIBUSI continue via dashboard/daftar-data
              if (role === "humas") return;
              setActive("workorder");
            }}
          />
        )}
        {active === "workorder" && role === "distribusi" && (
          <WorkOrderForm
            caseId={complaintId}
            serviceRequestId={serviceRequestId}
            onSaved={(id) => {
              setWorkOrderId(id);
              // Don't automatically switch to repair - let distribusi handle it later via dashboard
              // setActive("repair");
            }}
          />
        )}
        {active === "repair" && role === "distribusi" && (
          <RepairReportForm
            caseId={complaintId}
            spkId={workOrderId}
            onSaved={() => {
              // selesai flow
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
