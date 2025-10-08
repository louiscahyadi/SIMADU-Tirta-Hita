"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useToast } from "@/components/ToastProvider";

const reasonsList = [
  "WM Mati",
  "WM Kabur",
  "Pipa Bocor",
  "Kaca WM Pecah",
  "Tidak ada air",
  "Bocor sesudah WM",
  "Bocor sebelum WM",
  "WM tertanam",
  "WM dibawah bangunan",
  "WM diluar tembok batas",
  "WM ditempat sempit",
  "WM tertanam bahan bangunan",
  "Lokasi WM rendah",
  "Pemakaian tinggi",
  "Air kecil",
] as const;

const schema = z.object({
  customerName: z.string().min(1),
  address: z.string().min(1),
  serviceNumber: z.string().optional(),
  phone: z.string().optional(),
  receivedAt: z.string().optional(),
  receivedBy: z.string().optional(),
  handledAt: z.string().optional(),
  handlerName: z.string().optional(),
  inspectedAt: z.string().optional(),
  inspectorName: z.string().optional(),
  reasons: z.array(z.enum(reasonsList)).default([]),
  otherReason: z.string().optional(),
  actionTaken: z.string().optional(),
  serviceCostBy: z.enum(["PERUMDA AM", "Langganan"]).optional(),
  handoverReceiver: z.string().optional(),
  handoverCustomer: z.string().optional(),
  handoverAt: z.string().optional(),
});

export default function ServiceRequestForm({
  onSaved,
  initialData,
}: {
  onSaved?: (id: string) => void;
  initialData?: Partial<z.infer<typeof schema>> & {
    // passthrough fields from complaint for mapping
    complaintCategory?: string;
  };
}) {
  const { push } = useToast();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      reasons: [],
      customerName: initialData?.customerName || "",
      address: initialData?.address || "",
      serviceNumber: initialData?.serviceNumber,
      phone: initialData?.phone,
      otherReason: initialData?.otherReason,
      actionTaken: initialData?.actionTaken,
    },
  });

  // Map complaint category to reasons if it matches our list; otherwise drop to otherReason
  if (initialData?.complaintCategory) {
    const cat = initialData.complaintCategory as (typeof reasonsList)[number] | string;
    if ((reasonsList as readonly string[]).includes(cat)) {
      // set as a reason
      form.setValue("reasons", [cat as (typeof reasonsList)[number]]);
    } else if (!form.getValues("otherReason")) {
      form.setValue("otherReason", cat);
    }
  }

  const onSubmit = async (values: z.infer<typeof schema>) => {
    const res = await fetch("/api/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) push({ message: "Gagal menyimpan", type: "error" });
    else {
      const json = await res.json();
      push({ message: "Permintaan service tersimpan", type: "success" });
      onSaved?.(json.id);
    }
    form.reset({ reasons: [] });
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Nama Pelanggan</label>
          <input className="input" {...form.register("customerName")} />
        </div>
        <div>
          <label className="label">No. Telp</label>
          <input className="input" {...form.register("phone")} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Alamat</label>
          <input className="input" {...form.register("address")} />
        </div>
        <div>
          <label className="label">No. S.L.</label>
          <input className="input" {...form.register("serviceNumber")} />
        </div>
        <div>
          <label className="label">Diterima (Tanggal & Jam)</label>
          <input type="datetime-local" className="input" {...form.register("receivedAt")} />
        </div>
        <div>
          <label className="label">Petugas Jaga</label>
          <input className="input" {...form.register("receivedBy")} />
        </div>
        <div>
          <label className="label">Dikerjakan (Tanggal & Jam)</label>
          <input type="datetime-local" className="input" {...form.register("handledAt")} />
        </div>
        <div>
          <label className="label">Petugas Penanggulangan</label>
          <input className="input" {...form.register("handlerName")} />
        </div>
        <div>
          <label className="label">Diperiksa (Tanggal & Jam)</label>
          <input type="datetime-local" className="input" {...form.register("inspectedAt")} />
        </div>
        <div>
          <label className="label">Nama Pemeriksa</label>
          <input className="input" {...form.register("inspectorName")} />
        </div>
      </div>

      <div>
        <label className="label">Alasan Permintaan Service</label>
        <div className="grid md:grid-cols-3 gap-y-2">
          {reasonsList.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" value={r} {...form.register("reasons")} />
              {r}
            </label>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Lain-lain</label>
          <input className="input" {...form.register("otherReason")} />
        </div>
        <div>
          <label className="label">Tindakan yang dilakukan</label>
          <input className="input" {...form.register("actionTaken")} />
        </div>
        <div>
          <label className="label">Biaya service ditanggung</label>
          <select className="input" {...form.register("serviceCostBy")}>
            <option value="">Pilih</option>
            <option>PERUMDA AM</option>
            <option>Langganan</option>
          </select>
        </div>
      </div>

      <fieldset className="border rounded p-3">
        <legend className="text-sm font-medium">Berita Acara (Ringkas)</legend>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">Yang menerima</label>
            <input className="input" {...form.register("handoverReceiver")} />
          </div>
          <div>
            <label className="label">Nama Pelanggan</label>
            <input className="input" {...form.register("handoverCustomer")} />
          </div>
          <div>
            <label className="label">Tanggal</label>
            <input type="datetime-local" className="input" {...form.register("handoverAt")} />
          </div>
        </div>
      </fieldset>

      <div className="pt-2">
        <button type="submit" className="btn">
          Simpan Permintaan
        </button>
      </div>
    </form>
  );
}
