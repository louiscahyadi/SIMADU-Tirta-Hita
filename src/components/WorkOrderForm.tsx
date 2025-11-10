"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import LoadingButton from "@/components/LoadingButton";
import SignatureUpload from "@/components/SignatureUpload";
import { useToast } from "@/components/ToastProvider";
import { parseErrorResponse } from "@/lib/errors";

type FormValues = {
  caseId: string;
  pspId: string;
  teamName: string;
  technicians: string;
  workOrderNumber?: string;
  // Tambahan field SPK
  reportDate?: string; // Lap. Hari / Tanggal
  reporterName?: string; // Nama Pelapor
  disturbanceLocation?: string; // Lokasi Gangguan
  handledDate?: string; // Hari / Tanggal ditangani
  handlingTime?: string; // Waktu Penanganan
  disturbanceType?: string; // Jenis Gangguan
  // Digital Signature
  creatorSignature?: string; // Base64 encoded signature image
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
  const router = useRouter();
  const { push } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const form = useForm<FormValues>({
    defaultValues: {
      caseId: caseId ?? "",
      pspId: serviceRequestId ?? "",
      teamName: "",
      technicians: "",
      workOrderNumber: "",
      reportDate: today,
      reporterName: "",
      disturbanceLocation: "",
      handledDate: today,
      handlingTime: "",
      disturbanceType: "",
      creatorSignature: "",
    },
  });
  const { setError } = form;

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    // Set timeout for loading state (30 seconds)
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
      push({
        message: "Permintaan melebihi batas waktu. Silakan coba lagi.",
        type: "error",
      });
    }, 30000);

    try {
      // Basic client-side guard
      if (!values.caseId || !values.pspId) {
        push({ message: "Kasus/PSP tidak valid", type: "error" });
        return;
      }

      // Validate signature
      if (!validateSignature()) {
        push({ message: "Tanda tangan wajib diisi sebelum menyimpan SPK", type: "error" });
        return;
      }
      const payload = {
        ...values,
        // normalize optional fields
        workOrderNumber: values.workOrderNumber?.trim() ? values.workOrderNumber.trim() : undefined,
        reporterName: values.reporterName?.trim() ? values.reporterName.trim() : undefined,
        disturbanceLocation: values.disturbanceLocation?.trim()
          ? values.disturbanceLocation.trim()
          : undefined,
        handlingTime: values.handlingTime?.trim() ? values.handlingTime.trim() : undefined,
        disturbanceType: values.disturbanceType?.trim() ? values.disturbanceType.trim() : undefined,
        creatorSignature: values.creatorSignature?.trim()
          ? values.creatorSignature.trim()
          : undefined,
      };

      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let msg = "Gagal menyimpan SPK";
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
        } catch (e) {
          // Error parsing response
        }
        push({ message: msg, type: "error" });
      } else {
        const json = await res.json();
        push({
          message:
            "SPK berhasil disimpan. Berita Acara akan dibuat setelah pekerjaan selesai di lapangan.",
          type: "success",
        });
        onSaved?.(json.id);

        // Redirect ke halaman beranda divisi distribusi setelah berhasil menyimpan SPK
        setTimeout(() => {
          router.push("/distribusi");
        }, 1500); // Delay 1.5 detik untuk memastikan user melihat pesan sukses
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

  // Add validation for signature
  const validateSignature = () => {
    const signature = form.getValues("creatorSignature");
    if (!signature || signature.trim() === "") {
      setError("creatorSignature", {
        type: "required",
        message: "Tanda tangan wajib diisi",
      });
      return false;
    }
    return true;
  };

  // Prefill fields from PSP when serviceRequestId is available
  useEffect(() => {
    const id = serviceRequestId;
    if (!id) return;
    (async () => {
      try {
        console.log("🔄 Auto-filling SPK form from PSP ID:", id);
        const res = await fetch(`/api/service-requests?id=${encodeURIComponent(id)}`);
        if (!res.ok) {
          console.log("❌ Failed to fetch PSP data:", res.status);
          return;
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.log("❌ Invalid response content type:", contentType);
          return;
        }

        const data = await res.json();
        console.log("📦 PSP data received:", data);

        // Ensure pspId is set in the form in case defaultValue was empty on first render
        setValue("pspId", id, { shouldValidate: true });

        // Nama Pelapor: prioritas dari data PSP, fallback ke complaint
        const reporter = (
          data?.reporterName ||
          data?.customerName ||
          data?._complaintCustomerName ||
          ""
        )
          .toString()
          .trim();

        // Lokasi Gangguan: prioritas dari address PSP, fallback ke complaint
        const address = (data?.address || data?._complaintAddress || "").toString().trim();

        // Jenis Gangguan: dari kategori complaint
        const jenis = (data?._complaintCategory || "").toString().trim();

        // Complaint ID untuk linking
        const compId = (data?._complaintId || data?.complaintId || "").toString();

        // Set values dengan logging untuk debugging
        if (reporter) {
          console.log("✅ Setting Nama Pelapor:", reporter);
          setValue("reporterName", reporter, { shouldValidate: true });
        } else {
          console.log("⚠️ No reporter name found in PSP data");
        }

        if (address) {
          console.log("✅ Setting Lokasi Gangguan:", address);
          setValue("disturbanceLocation", address, { shouldValidate: true });
        } else {
          console.log("⚠️ No address found in PSP data");
        }

        if (jenis) {
          console.log("✅ Setting Jenis Gangguan:", jenis);
          setValue("disturbanceType", jenis, { shouldValidate: true });
        } else {
          console.log("⚠️ No disturbance type found in PSP data");
        }

        // Set complaint ID from service request data or URL fallback
        if (compId) {
          setValue("caseId", compId, { shouldValidate: true });
          console.log("✅ Setting Case ID:", compId);
        } else {
          // Fallback: if PSP not linked to complaint, try complaintId from URL
          try {
            const q = new URLSearchParams(window.location.search);
            const fromUrl = q.get("complaintId");
            if (fromUrl) {
              setValue("caseId", fromUrl, { shouldValidate: true });
              console.log("✅ Setting Case ID from URL:", fromUrl);
            }
          } catch {}
        }

        // Show success message to user
        push({
          message:
            "Data nama pelapor, lokasi gangguan, dan jenis gangguan berhasil diisi otomatis dari PSP",
          type: "success",
        });
      } catch (error) {
        console.error("❌ Error auto-filling SPK form:", error);
        push({
          message: "Gagal mengisi otomatis dari data PSP. Silakan isi manual.",
          type: "error",
        });
      }
    })();
    // intentionally run once per serviceRequestId
  }, [serviceRequestId, setValue, push]);

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      {/* Info Auto-fill */}
      {serviceRequestId && (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">Auto-fill Aktif:</span>
            <span className="ml-1">
              Nama pelapor, lokasi gangguan, dan jenis gangguan akan diisi otomatis dari data PSP.
            </span>
          </div>
        </div>
      )}

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
          <label className="label">
            Nama Pelapor
            <span className="text-xs text-green-600 ml-1">(otomatis dari PSP)</span>
          </label>
          <input
            className="input bg-green-50 border-green-200"
            {...register("reporterName", { maxLength: 100 })}
            placeholder="Akan terisi otomatis dari data PSP"
          />
        </div>
        <div>
          <label className="label">
            Lokasi Gangguan
            <span className="text-xs text-green-600 ml-1">(otomatis dari PSP)</span>
          </label>
          <input
            className="input bg-green-50 border-green-200"
            {...register("disturbanceLocation", { maxLength: 255 })}
            placeholder="Akan terisi otomatis dari data PSP"
          />
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
          <label className="label">
            Jenis Gangguan
            <span className="text-xs text-green-600 ml-1">(otomatis dari PSP)</span>
          </label>
          <input
            className="input bg-green-50 border-green-200"
            placeholder="Akan terisi otomatis dari kategori pengaduan"
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

      {/* Digital Signature Section */}
      <div className="card p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <div className="mb-3">
          <h3 className="font-medium text-blue-900 mb-1">Tanda Tangan Pembuat SPK</h3>
          <p className="text-sm text-blue-700">
            Upload gambar tanda tangan untuk validasi dan otorisasi SPK ini
          </p>
        </div>

        <SignatureUpload
          value={form.watch("creatorSignature")}
          onChange={(signature) => {
            setValue("creatorSignature", signature || "", { shouldValidate: true });
          }}
          label="Tanda Tangan Digital"
          required={true}
          error={errors.creatorSignature?.message}
          maxSizeKB={300} // Smaller size for faster loading
        />
      </div>

      <div className="pt-2">
        <LoadingButton
          type="submit"
          loading={isSubmitting}
          loadingText="Menyimpan..."
          className="btn"
          disabled={!form.watch("creatorSignature")} // Disable if no signature
        >
          Simpan SPK
        </LoadingButton>

        {!form.watch("creatorSignature") && (
          <p className="text-sm text-red-600 mt-2">
            ⚠️ Tanda tangan wajib diisi sebelum menyimpan SPK
          </p>
        )}
      </div>
    </form>
  );
}
