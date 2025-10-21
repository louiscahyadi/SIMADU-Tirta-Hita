"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useToast } from "@/components/ToastProvider";

const phoneRegex = /^[+\d ]+$/;

const uiSchema = z.object({
  caseId: z.string().optional(),
  reporterName: z.string().min(2).max(100),
  reporterPhone: z.string().min(8).max(20).regex(phoneRegex, {
    message: "Hanya boleh +, spasi, dan angka",
  }),
  address: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  requestDate: z.string().min(1), // yyyy-mm-dd
  notes: z.string().max(2000).optional(),
});

type UiInput = z.infer<typeof uiSchema>;

export default function ServiceRequestForm({
  onSaved,
  initialData,
  caseId,
}: {
  onSaved?: (id: string) => void;
  initialData?: Partial<UiInput> & { complaintCategory?: string };
  caseId?: string;
}) {
  const { push } = useToast();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const form = useForm<UiInput>({
    resolver: zodResolver(uiSchema),
    defaultValues: {
      caseId: caseId || initialData?.caseId,
      reporterName: initialData?.reporterName || "",
      reporterPhone: initialData?.reporterPhone || "",
      address: initialData?.address || "",
      description: initialData?.description || "",
      urgency: initialData?.urgency || "MEDIUM",
      requestDate: initialData?.requestDate || today,
      notes: initialData?.notes || "",
    },
  });

  const onSubmit = async (values: UiInput) => {
    const payload = {
      ...values,
      // normalize
      notes: values.notes?.trim() ? values.notes : undefined,
    };
    const res = await fetch("/api/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      push({ message: "Gagal menyimpan", type: "error" });
      return;
    }
    const json = await res.json();
    push({ message: "Permintaan service tersimpan", type: "success" });
    onSaved?.(json.id);
    form.reset({
      caseId: caseId || "",
      reporterName: "",
      reporterPhone: "",
      address: "",
      description: "",
      urgency: "MEDIUM",
      requestDate: today,
      notes: "",
    });
  };

  const { register, handleSubmit, formState } = form;
  const { errors } = formState;

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      {/* Hidden caseId when present (from complaint) */}
      {caseId ? <input type="hidden" {...register("caseId")} value={caseId} /> : null}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Nama Pelapor</label>
          <input className="input" {...register("reporterName")} />
          {errors.reporterName && (
            <div className="text-xs text-red-600">{errors.reporterName.message as string}</div>
          )}
        </div>
        <div>
          <label className="label">No. Kontak</label>
          <input
            className="input"
            placeholder="contoh: +62 812 3456 7890"
            {...register("reporterPhone")}
          />
          {errors.reporterPhone && (
            <div className="text-xs text-red-600">{errors.reporterPhone.message as string}</div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="label">Alamat/Lokasi</label>
          <input className="input" {...register("address")} />
          {errors.address && (
            <div className="text-xs text-red-600">{errors.address.message as string}</div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="label">Deskripsi/Keluhan</label>
          <textarea className="input min-h-[120px]" {...register("description")} />
          {errors.description && (
            <div className="text-xs text-red-600">{errors.description.message as string}</div>
          )}
        </div>
        <div>
          <label className="label">Urgensi</label>
          <select className="input" {...register("urgency")} defaultValue="MEDIUM">
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
          {errors.urgency && (
            <div className="text-xs text-red-600">{errors.urgency.message as string}</div>
          )}
        </div>
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
        <button type="submit" className="btn">
          Simpan Permintaan
        </button>
      </div>
    </form>
  );
}
