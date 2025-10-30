"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import Breadcrumbs from "@/components/Breadcrumbs";
import LoadingButton from "@/components/LoadingButton";
import { useToast } from "@/components/ToastProvider";
import { parseErrorResponse } from "@/lib/errors";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FormValues>({});
  const { push } = useToast();

  // Normalize phone: remove spaces and dashes, convert +62 to 0
  const normalizePhone = (raw?: string | null) => {
    if (!raw) return undefined;
    let v = String(raw).replace(/[ \-]/g, "");
    if (v.startsWith("+62")) v = "0" + v.slice(3);
    // If it ends up empty, treat as undefined (optional field)
    return v.length ? v : undefined;
  };

  // Flexible validator accepting mobile and landline examples with spaces/dashes
  const validatePhone = (value?: string) => {
    if (!value) return true; // optional field
    const v = normalizePhone(value) ?? "";
    const mobileRe = /^08[1-9]\d{6,10}$/; // 09-13 digits total, starts 08X
    const landlineRe = /^(021\d{7,8}|0361\d{6,8})$/; // Jakarta/Bali examples
    const ok = mobileRe.test(v) || landlineRe.test(v);
    return ok || "Nomor tidak valid. Contoh: 08123456789 atau 021-1234567";
  };

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
      // Optional: normalize on client before sending
      const payload: FormValues = {
        ...values,
        phone: normalizePhone(values.phone),
      };
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        try {
          const parsed = await parseErrorResponse(res);
          push({ message: parsed.message, type: "error" });
        } catch {
          push({ message: "Gagal mengirim pengaduan. Mohon lengkapi data.", type: "error" });
        }
        return;
      }
      const json = await res.json();
      setSubmittedId(json.id);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
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
                  placeholder="08123456789 atau 021-1234567"
                  {...form.register("phone", {
                    validate: validatePhone,
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
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                loadingText="Mengirim..."
                className="btn"
              >
                Kirim Pengaduan
              </LoadingButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
