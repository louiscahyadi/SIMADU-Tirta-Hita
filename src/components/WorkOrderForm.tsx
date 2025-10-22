"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { useToast } from "@/components/ToastProvider";

type FormValues = {
  caseId: string;
  pspId: string;
  teamName: string;
  technicians: string;
  scheduledDate: string;
  instructions?: string;
  workOrderNumber?: string;
};

export default function WorkOrderForm({
  caseId,
  serviceRequestId,
  onSaved,
}: {
  caseId?: string;
  serviceRequestId?: string;
  onSaved?: (id: string) => void;
}) {
  const { push } = useToast();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const form = useForm<FormValues>({
    defaultValues: {
      caseId: caseId ?? "",
      pspId: serviceRequestId ?? "",
      teamName: "",
      technicians: "",
      scheduledDate: today,
      instructions: "",
      workOrderNumber: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    // Basic client-side guard
    if (!values.caseId || !values.pspId) {
      push({ message: "Kasus/PSP tidak valid", type: "error" });
      return;
    }
    const payload = {
      ...values,
      // normalize optional fields
      instructions: values.instructions?.trim() ? values.instructions : undefined,
      workOrderNumber: values.workOrderNumber?.trim() ? values.workOrderNumber.trim() : undefined,
    };

    const res = await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = "Gagal menyimpan";
      try {
        const j = await res.json();
        if (j?.error) msg = typeof j.error === "string" ? j.error : "Gagal menyimpan";
      } catch {}
      push({ message: msg, type: "error" });
    } else {
      const json = await res.json();
      push({ message: "SPK tersimpan", type: "success" });
      onSaved?.(json.id);
      form.reset({
        caseId: caseId ?? "",
        pspId: serviceRequestId ?? "",
        teamName: "",
        technicians: "",
        scheduledDate: today,
        instructions: "",
        workOrderNumber: "",
      });
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      {/* Hidden IDs */}
      <input type="hidden" value={caseId ?? ""} {...register("caseId", { required: true })} />
      <input
        type="hidden"
        value={serviceRequestId ?? ""}
        {...register("pspId", { required: true })}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Tim/Unit Pelaksana</label>
          <input
            className="input"
            {...register("teamName", { required: true, minLength: 2, maxLength: 100 })}
          />
          {errors.teamName && <div className="text-xs text-red-600">Wajib 2–100 karakter</div>}
        </div>
        <div>
          <label className="label">Teknisi (pisahkan dengan koma)</label>
          <input
            className="input"
            placeholder="contoh: Budi, Wayan, Sari"
            {...register("technicians", { required: true, minLength: 2, maxLength: 200 })}
          />
          {errors.technicians && <div className="text-xs text-red-600">Wajib 2–200 karakter</div>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Jadwal Pekerjaan</label>
          <input type="date" className="input" {...register("scheduledDate", { required: true })} />
          {errors.scheduledDate && <div className="text-xs text-red-600">Tanggal wajib</div>}
        </div>
        <div>
          <label className="label">Nomor SPK (opsional)</label>
          <input className="input" {...register("workOrderNumber", { maxLength: 100 })} />
        </div>
      </div>

      <div>
        <label className="label">Catatan Teknis/Instruksi (opsional)</label>
        <textarea
          className="input min-h-[100px]"
          {...register("instructions", { maxLength: 2000 })}
        />
        {errors.instructions && <div className="text-xs text-red-600">Maksimal 2000 karakter</div>}
      </div>

      <div className="pt-2">
        <button type="submit" className="btn">
          Simpan SPK
        </button>
      </div>
    </form>
  );
}
