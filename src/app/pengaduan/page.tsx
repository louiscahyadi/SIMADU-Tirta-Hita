"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import Breadcrumbs from "@/components/Breadcrumbs";

const categories = [
  "pipa bocor",
  "pipa keropos",
  "pipa pecah",
  "bocor sebelum water meter",
  "bocor sesudah water meter",
  "bocor setelah ganti wm",
  "flug keran bocor",
  "kopling bocor",
  "lockable bocor",
  "air mati",
  "air kecil",
  "air keruh",
  "cek akurasi water meter",
  "pengangkatan water meter",
  "pindah water meter",
  "tanpa water meter",
  "water meter anginan",
  "water meter berbunyi",
  "water meter berembun",
  "water meter bocor",
  "water meter hialng",
  "water meter kabur",
  "water meter macet",
  "water meter pecah",
  "water meter rusak",
  "water meter tertimbun",
  "badan water meter bocor",
  "pemakaian tinggi",
  "air berbau",
] as const;

type FormValues = {
  customerName: string;
  address: string;
  mapsLink?: string;
  connectionNumber?: string;
  phone?: string;
  complaintText: string;
  category: string;
};

export default function PublicComplaintPage() {
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const form = useForm<FormValues>({});

  const onSubmit = async (values: FormValues) => {
    const res = await fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      alert("Gagal mengirim pengaduan. Mohon lengkapi data.");
      return;
    }
    const json = await res.json();
    setSubmittedId(json.id);
    form.reset();
  };

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Pengaduan" }]} />
      {submittedId ? (
        <div className="max-w-xl mx-auto card p-6 space-y-3">
          <h1 className="text-xl font-semibold">Pengaduan terkirim</h1>
          <p className="text-gray-700">Terima kasih. Nomor referensi:</p>
          <div className="font-mono">{submittedId}</div>
          <p className="text-gray-600 text-sm">
            Petugas kami akan menindaklanjuti laporan Anda. Simpan nomor referensi ini bila
            diperlukan.
          </p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto card p-6">
          <h1 className="text-xl font-semibold mb-4">Form Pengaduan Pelanggan</h1>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Nama Pelanggan</label>
                <input className="input" {...form.register("customerName", { required: true })} />
              </div>
              <div>
                <label className="label">No. HP</label>
                <input
                  className="input"
                  placeholder="08xxxxxxxxxx"
                  {...form.register("phone", {
                    pattern: {
                      value: /^(\+62|0)8[1-9][0-9]{6,10}$/,
                      message: "Format no HP tidak valid",
                    },
                  })}
                />
                {form.formState.errors.phone?.message ? (
                  <div className="text-red-600 text-xs mt-1">
                    {form.formState.errors.phone?.message as string}
                  </div>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <label className="label">Alamat</label>
                <input className="input" {...form.register("address", { required: true })} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Link Maps (opsional)</label>
                <input
                  className="input"
                  placeholder="https://maps.app.goo.gl/..."
                  {...form.register("mapsLink")}
                />
              </div>
              <div>
                <label className="label">No. Sambungan Pelanggan</label>
                <input className="input" {...form.register("connectionNumber")} />
              </div>
              <div>
                <label className="label">Kategori Pengaduan</label>
                <select
                  className="input"
                  {...form.register("category", { required: "Pilih kategori" })}
                >
                  <option value="">Pilih</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {form.formState.errors.category?.message ? (
                  <div className="text-red-600 text-xs mt-1">
                    {form.formState.errors.category?.message as string}
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="label">Keluhan / Pengaduan</label>
              <textarea
                className="input min-h-28"
                {...form.register("complaintText", { required: "Wajib diisi" })}
              />
              {form.formState.errors.complaintText?.message ? (
                <div className="text-red-600 text-xs mt-1">
                  {form.formState.errors.complaintText?.message as string}
                </div>
              ) : null}
            </div>

            <div className="pt-2">
              <button type="submit" className="btn">
                Kirim Pengaduan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
