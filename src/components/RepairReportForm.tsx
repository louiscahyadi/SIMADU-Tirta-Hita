"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import LoadingButton from "@/components/LoadingButton";
import SignatureUpload from "@/components/SignatureUpload";
import { useToast } from "@/components/ToastProvider";
import { parseErrorResponse } from "@/lib/errors";

// Jenis perbaikan berdasarkan formulir
const REPAIR_TYPES = [
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
  "Ganti Ventil Angin",
  "Ganti Manometer",
  "Ganti Giboult Joint",
  "Ganti Karet Giboult Joint",
  "Ganti Valve",
  "Ganti Boch",
  "Ganti Tee Verloop",
  "Ganti Tee Sneck",
  "Ganti Tapping Saddle",
  "Kencangkan Water Muor",
  "Kencangkan Copling",
  "Kencangkan Tapping Saddle",
  "Kencangkan Giboult Joint",
  "Kencangkan As Valve",
];

const NOT_HANDLED_REASONS = [
  "Alamat tidak jelas / lengkap",
  "Alamat bocor tidak ditemukan",
  "Rumah Kosong tidak dihuni",
  "Rumah Kosong tapi dihuni",
  "Nama tidak dikenal",
  "Air got / Limbah / Mata air",
];

type FormValues = {
  caseId: string;
  spkId: string;
  // Jenis Perbaikan/Penanganan (checkbox list)
  repairTypes: string[];
  otherRepairType?: string;
  // Alasan tidak dilakukan penanganan (jika tidak ditangani)
  notHandledReasons: string[];
  otherNotHandledReason?: string;
  // Info umum
  startTime: string;
  endTime: string;
  result: "FIXED" | "NOT_FIXED";
  // Info lokasi
  city?: string;
  executorName?: string;
  team?: string;
  // Digital signature
  executorSignature?: string;
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
  const router = useRouter();
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
      repairTypes: [],
      otherRepairType: "",
      notHandledReasons: [],
      otherNotHandledReason: "",
      startTime: nowLocal,
      endTime: nowLocal,
      result: "FIXED",
      city: "",
      executorName: "",
      team: "",
      executorSignature: "",
    },
  });

  const [caseIdLoaded, setCaseIdLoaded] = useState(false);

  const onSubmit = async (values: FormValues) => {
    console.log("=== FORM SUBMIT STARTED ===");
    console.log("Values being sent:", JSON.stringify(values, null, 2));
    setIsSubmitting(true); // Set timeout for loading state (30 seconds)
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
      push({
        message: "Permintaan melebihi batas waktu. Silakan coba lagi.",
        type: "error",
      });
    }, 30000);

    try {
      if (!values.caseId || !values.spkId) {
        push({
          message: `Data tidak lengkap: ${!values.caseId ? "ID Kasus kosong" : ""} ${!values.spkId ? "ID SPK kosong" : ""}`,
          type: "error",
        });
        return;
      }

      // Basic validation: If FIXED, should have at least some repair types
      if (
        values.result === "FIXED" &&
        values.repairTypes.length === 0 &&
        !values.otherRepairType?.trim()
      ) {
        push({
          message: "Silakan pilih minimal satu jenis perbaikan untuk hasil FIXED",
          type: "error",
        });
        return;
      }

      // If NOT_FIXED, should have reasons
      if (
        values.result === "NOT_FIXED" &&
        values.notHandledReasons.length === 0 &&
        !values.otherNotHandledReason?.trim()
      ) {
        push({ message: "Silakan pilih minimal satu alasan untuk hasil NOT_FIXED", type: "error" });
        return;
      }

      // Signature validation
      if (!values.executorSignature?.trim()) {
        push({
          message: "Tanda tangan pelaksana wajib diisi untuk menyelesaikan Berita Acara",
          type: "error",
        });
        return;
      }

      // Convert datetime-local format to ISO string
      const payload = {
        ...values,
        startTime: new Date(values.startTime).toISOString(),
        endTime: new Date(values.endTime).toISOString(),
      };

      console.log("Payload with converted dates:", payload);

      const res = await fetch("/api/repair-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let msg = "Gagal menyimpan";
        try {
          const parsed = await parseErrorResponse(res);
          console.error("API Error Response:", parsed);
          msg = parsed.message || msg;
          // Show validation details if available
          if (parsed.details?.fieldErrors) {
            console.error("Field errors:", parsed.details.fieldErrors);
            const fieldErrors = Object.entries(parsed.details.fieldErrors)
              .map(
                ([field, errors]) =>
                  `${field}: ${Array.isArray(errors) ? errors.join(", ") : errors}`,
              )
              .join("\n");
            msg += `\n\nDetail error:\n${fieldErrors}`;
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        push({ message: msg, type: "error" });
      } else {
        const json = await res.json();
        push({ message: "Berita acara perbaikan berhasil disimpan", type: "success" });
        onSaved?.(json.id);

        // Redirect to distribusi dashboard after successful save
        setTimeout(() => {
          router.push("/distribusi");
        }, 1500); // Give time for success message to be seen
      }
    } catch (error) {
      clearTimeout(timeoutId);
      push({
        message: `Terjadi kesalahan: ${error instanceof Error ? error.message : "Kesalahan tidak dikenal"}`,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  // Auto-fill fields from SPK data
  useEffect(() => {
    if (spkId) {
      const fetchSPKData = async () => {
        try {
          console.log("🔄 Auto-filling form from SPK ID:", spkId);
          const res = await fetch(`/api/work-orders?id=${encodeURIComponent(spkId)}`, {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
            cache: "no-cache",
          });

          if (!res.ok) {
            console.log("❌ Failed to fetch SPK data:", res.status);
            return;
          }

          const spkData = await res.json();
          console.log("📋 SPK Data received:", spkData);

          // Auto-fill Tim/Regu from teamName
          if (spkData.teamName || spkData.team) {
            const teamValue = spkData.teamName || spkData.team;
            setValue("team", teamValue);
            console.log("✅ Auto-filled Tim/Regu:", teamValue);
          }

          // Auto-fill Nama Pelaksana from technicians
          if (spkData.technicians) {
            setValue("executorName", spkData.technicians);
            console.log("✅ Auto-filled Nama Pelaksana:", spkData.technicians);
          }
        } catch (error) {
          console.error("❌ Error fetching SPK data:", error);
        }
      };

      fetchSPKData();
    }
  }, [spkId, setValue]);

  // If no caseId provided but we have spkId, show a message
  useEffect(() => {
    if (!caseId && spkId && !caseIdLoaded) {
      setCaseIdLoaded(true);
      console.warn(
        "No caseId provided for RepairReportForm. This should be passed from URL complaintId parameter.",
      );
    }
  }, [caseId, spkId, caseIdLoaded]);

  const start = watch("startTime");
  const watchedRepairTypes = watch("repairTypes");
  const watchedNotHandledReasons = watch("notHandledReasons");
  const result = watch("result");
  const executorSignature = watch("executorSignature");

  // Check if form is ready to submit
  const isFormReady = executorSignature && executorSignature.trim().length > 0;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        console.log("=== FORM SUBMIT EVENT ===");
        console.log("Form errors:", Object.keys(errors));
        console.log("Current values:", watch());
        handleSubmit(onSubmit)(e);
      }}
    >
      {/* Hidden IDs */}
      <input type="hidden" value={caseId ?? ""} {...register("caseId", { required: true })} />
      <input type="hidden" value={spkId ?? ""} {...register("spkId", { required: true })} />

      {/* Show validation errors if any */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="font-medium text-red-800 mb-2">Form Validation Errors:</div>
          {Object.entries(errors).map(([key, error]) => (
            <div key={key} className="text-sm text-red-600">
              <strong>{key}:</strong> {error?.message || "Required field"}
            </div>
          ))}
        </div>
      )}

      {/* Info Pelaksana dan Lokasi */}
      <div className="card p-4">
        <h3 className="font-medium mb-3">Informasi Pelaksana</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Kota/Wilayah</label>
            <input
              className="input"
              placeholder="Singaraja"
              {...register("city", { maxLength: 100 })}
            />
          </div>
          <div>
            <label className="label">
              Nama Pelaksana <span className="text-xs text-blue-600">(Auto dari SPK)</span>
            </label>
            <input
              className="input bg-blue-50 border-blue-200 text-blue-800"
              placeholder="Akan diisi otomatis dari SPK..."
              readOnly
              {...register("executorName", { maxLength: 100 })}
            />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label">
              Tim/Regu <span className="text-xs text-blue-600">(Auto dari SPK)</span>
            </label>
            <input
              className="input bg-blue-50 border-blue-200 text-blue-800"
              placeholder="Akan diisi otomatis dari SPK..."
              readOnly
              {...register("team", { maxLength: 100 })}
            />
          </div>
        </div>
      </div>
      {/* Waktu Pelaksanaan */}
      <div className="card p-4">
        <h3 className="font-medium mb-3">Waktu Pelaksanaan</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Waktu Mulai</label>
            <input
              type="datetime-local"
              className="input"
              defaultValue={nowLocal}
              {...register("startTime", { required: true })}
            />
            {errors.startTime && <div className="text-xs text-red-600">Wajib diisi</div>}
          </div>
          <div>
            <label className="label">Waktu Selesai</label>
            <input
              type="datetime-local"
              className="input"
              defaultValue={nowLocal}
              min={start || undefined}
              {...register("endTime", { required: true })}
            />
            {errors.endTime && <div className="text-xs text-red-600">Wajib diisi</div>}
          </div>
        </div>
      </div>
      {/* Hasil Pekerjaan */}
      <div className="card p-4">
        <h3 className="font-medium mb-3">Hasil Pekerjaan</h3>
        <div>
          <label className="label">Status Hasil</label>
          <select
            className="input"
            {...register("result", { required: true })}
            defaultValue="FIXED"
          >
            <option value="FIXED">FIXED - Berhasil diperbaiki</option>
            <option value="NOT_FIXED">NOT_FIXED - Tidak dapat diperbaiki</option>
          </select>
        </div>
      </div>
      {/* Jenis Perbaikan/Penanganan */}
      {result !== "NOT_FIXED" && (
        <div className="card p-4">
          <h3 className="font-medium mb-3">JENIS PERBAIKAN / PENANGANAN</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {REPAIR_TYPES.map((type, index) => (
              <label key={type} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  value={type}
                  {...register("repairTypes")}
                  className="rounded"
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
          <div className="mt-3">
            <label className="label">Lain-lain</label>
            <input
              className="input"
              placeholder="Jenis perbaikan lainnya..."
              {...register("otherRepairType", { maxLength: 200 })}
            />
          </div>
        </div>
      )}
      {/* Alasan Tidak Dilakukan Penanganan */}
      {result === "NOT_FIXED" && (
        <div className="card p-4">
          <h3 className="font-medium mb-3">ALASAN TIDAK DILAKUKAN PENANGANAN</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {NOT_HANDLED_REASONS.map((reason) => (
              <label key={reason} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  value={reason}
                  {...register("notHandledReasons")}
                  className="rounded"
                />
                <span>{reason}</span>
              </label>
            ))}
          </div>
          <div className="mt-3">
            <label className="label">Lain-lain</label>
            <input
              className="input"
              placeholder="Alasan lainnya..."
              {...register("otherNotHandledReason", { maxLength: 200 })}
            />
          </div>
        </div>
      )}

      {/* Tanda Tangan Digital */}
      <div className="card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 text-sm font-medium">✍️</span>
          </div>
          <h3 className="font-medium text-gray-800">Tanda Tangan Pelaksana Perbaikan</h3>
          <span className="text-red-500 text-sm">*</span>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <SignatureUpload
            value={watch("executorSignature")}
            onChange={(signature) => setValue("executorSignature", signature || "")}
            label="Upload Tanda Tangan"
            required={true}
            error={errors.executorSignature?.message}
          />
          <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
            <span>💡</span>
            <span>Tip: Foto tanda tangan di atas kertas putih untuk hasil terbaik</span>
          </div>
        </div>
      </div>
      <div className="pt-2">
        <LoadingButton
          type="submit"
          loading={isSubmitting}
          loadingText="Menyimpan..."
          className={`btn ${
            !isFormReady ? "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300" : ""
          }`}
          disabled={!isFormReady || isSubmitting}
        >
          {!isFormReady ? "Tanda Tangan Diperlukan" : "Simpan Berita Acara"}
        </LoadingButton>
      </div>
    </form>
  );
}
