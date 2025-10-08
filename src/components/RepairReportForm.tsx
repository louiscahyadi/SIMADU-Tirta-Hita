"use client";

import { useForm } from "react-hook-form";

import { useToast } from "@/components/ToastProvider";

const actionOptions = [
  "Ganti Pipa",
  "Ganti Siku",
  "Ganti Socket",
  "Ganti Double Nipple",
  "Ganti Verloop",
  "Ganti Water Muor",
  "Ganti Stop Kran",
  "Ganti Lockable",
  "Ganti Valve Socket",
  "Ganti Male Adaptor",
  "Ganti Ventil",
  "Ganti Manometer",
  "Ganti Giboult Joint",
  "Ganti Karet Giboult Joint",
  "Ganti Boch",
  "Ganti Tee Verloop",
  "Ganti Tee Stuck",
  "Ganti Tapping Saddle",
  "Kencangkan Water Muor",
  "Kencangkan Copling",
  "Kencangkan Tapping Saddle",
  "Kencangkan Giboult Joint",
  "Kencangkan As Valve",
] as const;

const reasonOptions = [
  "Alamat tidak jelas/lengkap",
  "Alamat bocor tidak ditemukan",
  "Rumah kosong tidak dihuni",
  "Rumah kosong tapi dihuni",
  "Nama tidak dikenal",
  "Air got/Limbah/Mata air",
] as const;

type FormValues = {
  actions: string[];
  otherActions?: string;
  notHandledReasons: string[];
  otherNotHandled?: string;
  city?: string;
  cityDate?: string;
  executorName?: string;
  team?: string;
  authorizedBy?: string;
  workOrderId?: string;
};

export default function RepairReportForm({
  workOrderId,
  onSaved,
}: {
  workOrderId?: string;
  onSaved?: (id: string) => void;
}) {
  const { push } = useToast();
  const form = useForm<FormValues>({
    defaultValues: {
      actions: [],
      notHandledReasons: [],
      city: "Singaraja",
      workOrderId,
    },
  });

  const onSubmit = async (values: FormValues) => {
    const res = await fetch("/api/repair-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, workOrderId }),
    });
    if (!res.ok) push({ message: "Gagal menyimpan", type: "error" });
    else {
      const json = await res.json();
      push({ message: "Berita acara tersimpan", type: "success" });
      onSaved?.(json.id);
    }
    form.reset({
      actions: [],
      notHandledReasons: [],
      city: "Singaraja",
      workOrderId,
    });
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <fieldset>
        <legend className="label">Jenis Perbaikan/Penanganan</legend>
        <div className="grid md:grid-cols-3 gap-y-2">
          {actionOptions.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" value={a} {...form.register("actions")} />
              {a}
            </label>
          ))}
        </div>
        <div className="mt-2">
          <label className="label">Lain-lain</label>
          <input className="input" {...form.register("otherActions")} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Alasan tidak dilakukan penanganan</legend>
        <div className="grid md:grid-cols-3 gap-y-2">
          {reasonOptions.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox"
                value={r}
                {...form.register("notHandledReasons")}
              />
              {r}
            </label>
          ))}
        </div>
        <div className="mt-2">
          <label className="label">Lain-lain</label>
          <input className="input" {...form.register("otherNotHandled")} />
        </div>
      </fieldset>

      <div className="grid md:grid-cols-4 gap-4">
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
        <div>
          <label className="label">Regu</label>
          <input className="input" {...form.register("team")} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Pejabat Mengetahui</label>
          <input className="input" {...form.register("authorizedBy")} />
        </div>
      </div>

      <input type="hidden" value={workOrderId ?? ""} {...form.register("workOrderId")} />
      <div className="pt-2">
        <button type="submit" className="btn">
          Simpan Berita Acara
        </button>
      </div>
    </form>
  );
}
