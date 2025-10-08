"use client";

import { useForm } from "react-hook-form";

import { useToast } from "@/components/ToastProvider";

type FormValues = {
  reportDate?: string;
  number?: string;
  handledDate?: string;
  reporterName?: string;
  handlingTime?: string;
  disturbanceLocation?: string;
  disturbanceType?: string;
  city?: string;
  cityDate?: string;
  executorName?: string;
  team?: string;
  serviceRequestId?: string;
};

export default function WorkOrderForm({
  serviceRequestId,
  onSaved,
}: {
  serviceRequestId?: string;
  onSaved?: (id: string) => void;
}) {
  const { push } = useToast();
  const form = useForm<FormValues>({ defaultValues: { serviceRequestId } });

  const onSubmit = async (values: FormValues) => {
    const res = await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, serviceRequestId }),
    });
    if (!res.ok) push({ message: "Gagal menyimpan", type: "error" });
    else {
      const json = await res.json();
      push({ message: "SPK tersimpan", type: "success" });
      onSaved?.(json.id);
    }
    form.reset({ serviceRequestId });
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="label">Lap. Hari/Tgl</label>
          <input type="date" className="input" {...form.register("reportDate")} />
        </div>
        <div>
          <label className="label">No.</label>
          <input className="input" {...form.register("number")} />
        </div>
        <div>
          <label className="label">Hari/Tgl ditangani</label>
          <input type="date" className="input" {...form.register("handledDate")} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Nama Pelapor</label>
          <input className="input" {...form.register("reporterName")} />
        </div>
        <div>
          <label className="label">Waktu Penanganan</label>
          <input className="input" {...form.register("handlingTime")} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Lokasi Gangguan</label>
          <input className="input" {...form.register("disturbanceLocation")} />
        </div>
        <div>
          <label className="label">Jenis Gangguan</label>
          <input className="input" {...form.register("disturbanceType")} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="label">Kota</label>
          <input className="input" defaultValue="Singaraja" {...form.register("city")} />
        </div>
        <div>
          <label className="label">Tanggal</label>
          <input type="date" className="input" {...form.register("cityDate")} />
        </div>
        <div>
          <label className="label">Pelaksana</label>
          <input className="input" {...form.register("executorName")} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="label">Regu/Team</label>
          <input className="input" {...form.register("team")} />
        </div>
      </div>

      <input type="hidden" value={serviceRequestId ?? ""} {...form.register("serviceRequestId")} />
      <div className="pt-2">
        <button type="submit" className="btn">
          Simpan SPK
        </button>
      </div>
    </form>
  );
}
