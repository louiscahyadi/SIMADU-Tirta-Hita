"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import LoadingButton from "@/components/LoadingButton";
import { useToast } from "@/components/ToastProvider";
import { parseErrorResponse } from "@/lib/errors";

type FormValues = {
  caseId: string;
  spkId: string;
  actionTaken: string;
  startTime: string;
  endTime: string;
  result: "FIXED" | "MONITORING" | "NOT_FIXED";
  remarks?: string;
  customerConfirmationName?: string;
};

export default function RepairReportForm({
  caseId,
  spkId,
  onSaved,
}: {
  caseId?: string;
  spkId?: string;
  onSaved?: (id: string) => void;
}) {
  const { push } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nowLocal = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);
  const form = useForm<FormValues>({
    defaultValues: {
      caseId: caseId ?? "",
      spkId: spkId ?? "",
      actionTaken: "",
      startTime: nowLocal,
      endTime: nowLocal,
      result: "FIXED",
      remarks: "",
      customerConfirmationName: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    // Set timeout for loading state (30 seconds)
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
      push({
        message: "Request timeout. Silakan coba lagi.",
        type: "error",
      });
    }, 30000);

    try {
      if (!values.caseId || !values.spkId) {
        push({ message: "Data kasus/SPK tidak valid", type: "error" });
        return;
      }
      const res = await fetch("/api/repair-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let msg = "Gagal menyimpan";
        try {
          const parsed = await parseErrorResponse(res);
          msg = parsed.message || msg;
        } catch {}
        push({ message: msg, type: "error" });
      } else {
        const json = await res.json();
        push({ message: "Berita acara tersimpan", type: "success" });
        onSaved?.(json.id);
        form.reset({
          caseId: caseId ?? "",
          spkId: spkId ?? "",
          actionTaken: "",
          startTime: nowLocal,
          endTime: nowLocal,
          result: "FIXED",
          remarks: "",
          customerConfirmationName: "",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;

  const start = watch("startTime");

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      {/* Hidden IDs */}
      <input type="hidden" value={caseId ?? ""} {...register("caseId", { required: true })} />
      <input type="hidden" value={spkId ?? ""} {...register("spkId", { required: true })} />

      <div>
        <label className="label">Tindakan Perbaikan</label>
        <textarea
          className="input min-h-[120px]"
          placeholder="Uraikan tindakan perbaikan yang dilakukan"
          {...register("actionTaken", { required: true, minLength: 10, maxLength: 4000 })}
        />
        {errors.actionTaken && <div className="text-xs text-red-600">Wajib 10–4000 karakter</div>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Waktu Mulai</label>
          <input
            type="datetime-local"
            className="input"
            {...register("startTime", { required: true })}
          />
          {errors.startTime && <div className="text-xs text-red-600">Wajib diisi</div>}
        </div>
        <div>
          <label className="label">Waktu Selesai</label>
          <input
            type="datetime-local"
            className="input"
            min={start || undefined}
            {...register("endTime", { required: true })}
          />
          {errors.endTime && <div className="text-xs text-red-600">Wajib diisi</div>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="label">Hasil</label>
          <select className="input" {...register("result", { required: true })}>
            <option value="FIXED">FIXED</option>
            <option value="MONITORING">MONITORING</option>
            <option value="NOT_FIXED">NOT_FIXED</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label">Catatan Akhir (opsional)</label>
          <input className="input" {...register("remarks", { maxLength: 2000 })} />
          {errors.remarks && <div className="text-xs text-red-600">Maksimal 2000 karakter</div>}
        </div>
      </div>

      <div>
        <label className="label">Nama Pihak yang Menerima (opsional)</label>
        <input
          className="input"
          placeholder="Nama pihak yang menerima"
          {...register("customerConfirmationName", { minLength: 2, maxLength: 100 })}
        />
        {errors.customerConfirmationName && (
          <div className="text-xs text-red-600">2–100 karakter</div>
        )}
      </div>

      <div className="pt-2">
        <LoadingButton
          type="submit"
          loading={isSubmitting}
          loadingText="Menyimpan..."
          className="btn"
        >
          Simpan Berita Acara
        </LoadingButton>
      </div>
    </form>
  );
}
