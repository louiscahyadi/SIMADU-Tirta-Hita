"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import LoadingButton from "@/components/LoadingButton";
import { useToast } from "@/components/ToastProvider";
import { parseErrorResponse } from "@/lib/errors";

type FormValues = {
  caseId: string;
  pspId: string;
  teamName: string;
  technicians: string;
  scheduledDate: string;
  instructions?: string;
  workOrderNumber?: string;
  // Tambahan field SPK
  reportDate?: string; // Lap. Hari / Tanggal
  reporterName?: string; // Nama Pelapor
  disturbanceLocation?: string; // Lokasi Gangguan
  handledDate?: string; // Hari / Tanggal ditangani
  handlingTime?: string; // Waktu Penanganan
  disturbanceType?: string; // Jenis Gangguan
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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      reportDate: today,
      reporterName: "",
      disturbanceLocation: "",
      handledDate: today,
      handlingTime: "",
      disturbanceType: "",
    },
  });
  const { setError } = form;

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
        reporterName: values.reporterName?.trim() ? values.reporterName.trim() : undefined,
        disturbanceLocation: values.disturbanceLocation?.trim()
          ? values.disturbanceLocation.trim()
          : undefined,
        handlingTime: values.handlingTime?.trim() ? values.handlingTime.trim() : undefined,
        disturbanceType: values.disturbanceType?.trim() ? values.disturbanceType.trim() : undefined,
      };

      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let msg = "Gagal menyimpan";
        try {
          const parsed = await parseErrorResponse(res);
          const fieldErrors = parsed.details?.fieldErrors as
            | Record<string, string[] | undefined>
            | undefined;
          if (fieldErrors) {
            for (const [k, arr] of Object.entries(fieldErrors)) {
              const m = arr?.[0];
              if (m) setError(k as keyof FormValues, { type: "server", message: m });
            }
          }
          msg = parsed.message || msg;
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
          reportDate: today,
          reporterName: "",
          disturbanceLocation: "",
          handledDate: today,
          handlingTime: "",
          disturbanceType: "",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;

  // Prefill fields from PSP when serviceRequestId is available
  useEffect(() => {
    const id = serviceRequestId;
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/service-requests?id=${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const data = await res.json();
        // Ensure pspId is set in the form in case defaultValue was empty on first render
        setValue("pspId", id, { shouldValidate: true });
        // Nama Pelapor: prefer reporterName, fallback to customerName
        const reporter = (
          data?.reporterName ||
          data?._complaintCustomerName ||
          data?.customerName ||
          ""
        ).toString();
        const address = (data?.address || data?._complaintAddress || "").toString();
        const jenis = (data?._complaintCategory || "").toString();
        const compId = (data?._complaintId || "").toString();
        if (reporter) setValue("reporterName", reporter, { shouldValidate: true });
        if (address) setValue("disturbanceLocation", address, { shouldValidate: true });
        if (jenis) setValue("disturbanceType", jenis, { shouldValidate: true });
        if (compId) setValue("caseId", compId, { shouldValidate: true });
        else {
          // Fallback: if PSP not linked to complaint, try complaintId from URL
          try {
            const q = new URLSearchParams(window.location.search);
            const fromUrl = q.get("complaintId");
            if (fromUrl) setValue("caseId", fromUrl, { shouldValidate: true });
          } catch {}
        }
      } catch {}
    })();
    // intentionally run once per serviceRequestId
  }, [serviceRequestId, setValue]);

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      {/* Hidden IDs - use defaultValue so setValue() can update later */}
      <input
        type="hidden"
        defaultValue={caseId ?? ""}
        {...register("caseId", { required: true })}
      />
      <input
        type="hidden"
        defaultValue={serviceRequestId ?? ""}
        {...register("pspId", { required: true })}
      />
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Lap. Hari / Tanggal</label>
          <input type="date" className="input" {...register("reportDate")} />
        </div>
        <div>
          <label className="label">Nomor</label>
          <input
            className="input"
            placeholder="Nomor SPK"
            {...register("workOrderNumber", { maxLength: 100 })}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Nama Pelapor</label>
          <input className="input" {...register("reporterName", { maxLength: 100 })} />
        </div>
        <div>
          <label className="label">Lokasi Gangguan</label>
          <input className="input" {...register("disturbanceLocation", { maxLength: 255 })} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Hari / Tanggal ditangani</label>
          <input type="date" className="input" {...register("handledDate")} />
        </div>
        <div>
          <label className="label">Waktu Penanganan</label>
          <input
            className="input"
            placeholder="Contoh: 09.00–11.30 WITA"
            {...register("handlingTime", { maxLength: 100 })}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Jenis Gangguan</label>
          <input
            className="input"
            placeholder="Contoh: kebocoran pipa"
            {...register("disturbanceType", { maxLength: 100 })}
          />
        </div>
      </div>

      <hr className="my-2" />
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
        <div />
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
        <LoadingButton
          type="submit"
          loading={isSubmitting}
          loadingText="Menyimpan..."
          className="btn"
        >
          Simpan SPK
        </LoadingButton>
      </div>
    </form>
  );
}
