"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import LoadingButton from "@/components/LoadingButton";
import { useToast } from "@/components/ToastProvider";
import {
  COMMON_ERRORS,
  SUCCESS_MESSAGES,
  FORM_ERRORS,
  VALIDATION_ERRORS,
} from "@/lib/errorMessages";
import { parseErrorResponse } from "@/lib/errors";

const phoneRegex = /^[+\d ]+$/;

const uiSchema = z.object({
  caseId: z.string().optional(),
  serviceNumber: z.string().trim().max(50).optional(),
  reporterName: z.string().min(2).max(100),
  reporterPhone: z.string().min(8).max(20).regex(phoneRegex, {
    message: VALIDATION_ERRORS.PHONE_FORMAT,
  }),
  address: z.string().min(5).max(200),
  // Diterima: Hari/Tanggal, Jam, Petugas Jaga
  receivedDate: z.string().optional(), // yyyy-mm-dd
  receivedTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { message: VALIDATION_ERRORS.TIME_FORMAT })
    .optional(),
  receivedBy: z.string().min(2).max(100).optional(),
  // Alasan Permintaan Service
  reasons: z.array(z.string()).optional(),
  otherReason: z.string().max(200).optional(),
  // Biaya service ditanggung oleh
  serviceCostBy: z.enum(["PERUMDA AM", "Langganan"]).optional(),
  // Opsional deskripsi tambahan
  description: z.string().max(2000).optional(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  requestDate: z.string().min(1), // yyyy-mm-dd
  notes: z.string().max(2000).optional(),
});

type UiInput = z.infer<typeof uiSchema>;

// Extended type untuk initialData yang bisa include complaintCategory
type InitialDataType = Partial<UiInput> & {
  complaintCategory?: string;
  serviceNumber?: string;
};

export default function ServiceRequestForm({
  onSaved,
  initialData,
  caseId,
}: {
  onSaved?: (id: string) => void;
  initialData?: InitialDataType;
  caseId?: string;
}) {
  const { push } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const form = useForm<UiInput>({
    resolver: zodResolver(uiSchema),
    defaultValues: {
      caseId: caseId || initialData?.caseId,
      serviceNumber: initialData?.serviceNumber || "",
      reporterName: initialData?.reporterName || "",
      reporterPhone: initialData?.reporterPhone || "",
      address: initialData?.address || "",
      receivedDate: "",
      receivedTime: "",
      receivedBy: "",
      reasons: [],
      otherReason: "",
      serviceCostBy: undefined,
      description: initialData?.description || "",
      urgency: initialData?.urgency || "MEDIUM",
      requestDate: initialData?.requestDate || today,
      notes: initialData?.notes || "",
    },
  });

  const onSubmit = async (values: UiInput) => {
    setIsSubmitting(true);

    // Set timeout for loading state (30 seconds)
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
      push({
        message: COMMON_ERRORS.TIMEOUT,
        type: "error",
      });
    }, 30000);

    try {
      // Compose receivedAt from date+time if provided
      const receivedAt =
        values.receivedDate && values.receivedTime
          ? new Date(`${values.receivedDate}T${values.receivedTime}:00`)
          : undefined;
      const payload: any = {
        caseId: values.caseId || undefined,
        serviceNumber: values.serviceNumber?.trim() || undefined,
        reporterName: values.reporterName,
        reporterPhone: values.reporterPhone,
        address: values.address,
        receivedAt,
        receivedBy: values.receivedBy?.trim() || undefined,
        reasons: (values.reasons || []).filter(Boolean),
        otherReason: values.otherReason?.trim() || undefined,
        serviceCostBy: values.serviceCostBy,
        description: values.description?.trim() || undefined,
        urgency: values.urgency,
        requestDate: values.requestDate,
        notes: values.notes?.trim() ? values.notes : undefined,
      };
      const res = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        try {
          const parsed = await parseErrorResponse(res);
          // Map validation errors to fields when available
          const fields = parsed.details?.fieldErrors as
            | Record<string, string[] | undefined>
            | undefined;
          if (fields) {
            for (const [k, arr] of Object.entries(fields)) {
              const m = arr?.[0];
              if (m && form.setError) {
                form.setError(k as keyof UiInput, { type: "server", message: m });
              }
            }
          }
          push({ message: parsed.message, type: "error" });
        } catch {
          push({ message: FORM_ERRORS.SERVICE_REQUEST.SAVE_FAILED, type: "error" });
        }
        return;
      }
      const json = await res.json();
      push({ message: SUCCESS_MESSAGES.SERVICE_REQUEST_SAVED, type: "success" });
      onSaved?.(json.id);
      form.reset({
        caseId: caseId || "",
        serviceNumber: "",
        reporterName: "",
        reporterPhone: "",
        address: "",
        receivedDate: "",
        receivedTime: "",
        receivedBy: "",
        reasons: [],
        otherReason: "",
        serviceCostBy: undefined,
        description: "",
        urgency: "MEDIUM",
        requestDate: today,
        notes: "",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { register, handleSubmit, formState, setValue } = form;
  const { errors } = formState;
  // When initialData/caseId comes in after mount (e.g., from query params), populate fields
  useEffect(() => {
    if (caseId) setValue("caseId", caseId);
    if (initialData) {
      if (typeof initialData.serviceNumber !== "undefined")
        setValue("serviceNumber", initialData.serviceNumber || "");
      if (typeof initialData.reporterName !== "undefined")
        setValue("reporterName", initialData.reporterName || "");
      if (typeof initialData.reporterPhone !== "undefined")
        setValue("reporterPhone", initialData.reporterPhone || "");
      if (typeof initialData.address !== "undefined")
        setValue("address", initialData.address || "");
    }
  }, [caseId, initialData, setValue]);
  const locked = !!caseId; // when coming from a complaint, prefilled fields are locked

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      {/* Hidden caseId when present (from complaint) */}
      {caseId ? <input type="hidden" {...register("caseId")} value={caseId} /> : null}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="label">No. Pelanggan (No. SL)</label>
          <input
            className={`input ${locked ? "bg-gray-50 text-gray-700 cursor-not-allowed" : ""}`}
            {...register("serviceNumber")}
            placeholder="Contoh: 01-234567"
            readOnly={locked}
            aria-readonly={locked}
            title={locked ? "Otomatis dari pengaduan" : undefined}
          />
          {errors.serviceNumber && (
            <div className="text-xs text-red-600">{errors.serviceNumber.message as string}</div>
          )}
        </div>
        <div>
          <label className="label">Nama Pelanggan</label>
          <input
            className={`input ${locked ? "bg-gray-50 text-gray-700 cursor-not-allowed" : ""}`}
            {...register("reporterName")}
            readOnly={locked}
            aria-readonly={locked}
            title={locked ? "Otomatis dari pengaduan" : undefined}
          />
          {errors.reporterName && (
            <div className="text-xs text-red-600">{errors.reporterName.message as string}</div>
          )}
        </div>
        <div>
          <label className="label">No. Kontak</label>
          <input
            className={`input ${locked ? "bg-gray-50 text-gray-700 cursor-not-allowed" : ""}`}
            placeholder="contoh: +62 812 3456 7890"
            {...register("reporterPhone")}
            readOnly={locked}
            aria-readonly={locked}
            title={locked ? "Otomatis dari pengaduan" : undefined}
          />
          {errors.reporterPhone && (
            <div className="text-xs text-red-600">{errors.reporterPhone.message as string}</div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="label">Alamat/Lokasi</label>
          <input
            className={`input ${locked ? "bg-gray-50 text-gray-700 cursor-not-allowed" : ""}`}
            {...register("address")}
            readOnly={locked}
            aria-readonly={locked}
            title={locked ? "Otomatis dari pengaduan" : undefined}
          />
          {errors.address && (
            <div className="text-xs text-red-600">{errors.address.message as string}</div>
          )}
        </div>
        {/* Diterima */}
        <div>
          <label className="label">Diterima - Hari / Tanggal</label>
          <input type="date" className="input" {...register("receivedDate")} />
        </div>
        <div>
          <label className="label">Diterima - Jam</label>
          <input type="time" className="input" {...register("receivedTime")} />
          {errors.receivedTime && (
            <div className="text-xs text-red-600">{errors.receivedTime.message as string}</div>
          )}
        </div>
        <div>
          <label className="label">Petugas Jaga</label>
          <input className="input" {...register("receivedBy")} />
        </div>

        {/* Alasan Permintaan Service */}
        <div className="md:col-span-2">
          <label className="label">Alasan Permintaan Service</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {[
              "WM. Mati",
              "WM. Kabur",
              "Pipa Bocor",
              "Kaca WM. Pecah",
              "Tidak ada air",
              "Bocor sesudah WM.",
              "Bocor sebelum WM.",
              "WM. tertanam",
              "WM. dibawah bangunan",
              "WM. diluar tembok batas",
              "WM. ditempat sempit",
              "WM. tertanam bahan bangunan",
              "Lokasi WM. rendah",
              "Pemakaian tinggi",
              "Air kecil",
            ].map((label) => (
              <label key={label} className="inline-flex items-center gap-2">
                <input type="checkbox" value={label} {...register("reasons")} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="label">Lain-lain</label>
          <input className="input" {...register("otherReason")} />
        </div>

        {/* Biaya */}
        <div className="md:col-span-2">
          <label className="label">Biaya service ditanggung oleh</label>
          <div className="flex items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" value="PERUMDA AM" {...register("serviceCostBy")} />
              <span>PERUMDA A.M.</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" value="Langganan" {...register("serviceCostBy")} />
              <span>Langganan</span>
            </label>
          </div>
        </div>

        {/* Opsional deskripsi tambahan */}
        <div className="md:col-span-2">
          <label className="label">Keterangan Tambahan (opsional)</label>
          <textarea className="input min-h-[100px]" {...register("description")} />
        </div>
        {/* Urgensi dihapus dari UI */}
        <div>
          <label className="label">Tanggal Permintaan</label>
          <input type="date" className="input" {...register("requestDate")} />
          {errors.requestDate && (
            <div className="text-xs text-red-600">{errors.requestDate.message as string}</div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="label">Catatan Tambahan (opsional)</label>
          <textarea className="input min-h-[80px]" {...register("notes")} />
          {errors.notes && (
            <div className="text-xs text-red-600">{errors.notes.message as string}</div>
          )}
        </div>
      </div>

      <div className="pt-2">
        <LoadingButton
          type="submit"
          loading={isSubmitting}
          loadingText="Menyimpan..."
          className="btn"
        >
          Simpan Permintaan
        </LoadingButton>
      </div>
    </form>
  );
}
