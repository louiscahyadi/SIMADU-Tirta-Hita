"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import LoadingButton from "@/components/LoadingButton";
import SignatureUpload from "@/components/SignatureUpload";
import { useToast } from "@/components/ToastProvider";
import { parseErrorResponse } from "@/lib/errors";

// UI form schema for client-side validation
const formSchema = z
  .object({
    caseId: z.string().min(1, "Case ID is required"),
    pspId: z.string().min(1, "PSP ID is required"),
    teamName: z.string().trim().min(2, "Tim minimal 2 karakter").max(100),
    technicians: z.string().trim().min(2, "Teknisi minimal 2 karakter").max(200),
    scheduledDate: z.string().min(1, "Jadwal pekerjaan wajib diisi"),
    workOrderNumber: z.string().optional(),
    reportDate: z.string().optional(),
    reporterName: z.string().optional(),
    disturbanceLocation: z.string().optional(),
    handledDate: z.string().optional(),
    handlingTime: z.string().optional(),
    disturbanceType: z.string().optional(),
    creatorSignature: z.string().min(1, "Tanda tangan wajib diisi"),
  })
  .superRefine((data, ctx) => {
    // Validate scheduledDate is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduledDate = new Date(data.scheduledDate);
    if (scheduledDate < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledDate"],
        message: "Jadwal tidak boleh lampau",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

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
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      caseId: caseId ?? "",
      pspId: serviceRequestId ?? "",
      teamName: "",
      technicians: "",
      scheduledDate: today, // Default to today
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
    watch,
    formState: { errors },
  } = form;

  const formValues = watch();

  // Prefill fields from PSP when serviceRequestId is available
  useEffect(() => {
    const id = serviceRequestId;
    if (!id) {
      console.log("❌ No serviceRequestId provided for auto-fill");
      return;
    }

    // Check if user is authenticated
    if (!session) {
      console.log("❌ No session found, skipping auto-fill");
      push({
        message: "Session tidak ditemukan. Silakan refresh halaman dan login kembali.",
        type: "error",
      });
      return;
    }

    // Debug session information
    const role = (session as any)?.user?.role || (session as any)?.role;
    console.log("🔍 Session debug info:");
    console.log("  - Role from session.user.role:", (session as any)?.user?.role);
    console.log("  - Role from session.role:", (session as any)?.role);
    console.log("  - Final role:", role);
    console.log("  - User name:", session.user?.name);
    console.log("  - User id:", (session as any)?.user?.id);

    // Allow both humas and distribusi to use auto-fill
    if (role && !["humas", "distribusi"].includes(role)) {
      console.log("❌ Invalid role for auto-fill:", role);
      push({
        message: `Role '${role}' tidak dapat menggunakan fitur auto-fill SPK.`,
        type: "info",
      });
      return;
    }

    (async () => {
      try {
        console.log("🔄 Auto-filling SPK form from PSP ID:", id);
        console.log("👤 Session user:", session.user?.email, "Role:", (session as any)?.role);
        console.log(
          "🌐 Making API request to:",
          `/api/service-requests?id=${encodeURIComponent(id)}`,
        );
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const res = await fetch(`/api/service-requests?id=${encodeURIComponent(id)}`, {
          method: "GET",
          credentials: "include", // Include cookies for authentication
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            // Include cache control headers
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: controller.signal,
          cache: "no-cache", // Ensure we get fresh data
        });

        clearTimeout(timeoutId);

        console.log("📡 API Response Status:", res.status);
        console.log("📡 API Response Headers:", Object.fromEntries(res.headers.entries()));
        if (!res.ok) {
          console.log("❌ Failed to fetch PSP data:", res.status, res.statusText);
          const errorText = await res.text();
          console.log("❌ Error response body:", errorText);

          // Handle specific HTTP status codes
          if (res.status === 401) {
            push({
              message: "Session expired. Silakan refresh halaman dan login kembali.",
              type: "error",
            });
          } else if (res.status === 403) {
            push({
              message: "Akses ditolak. Pastikan Anda login sebagai user distribusi.",
              type: "error",
            });
          } else if (res.status === 404) {
            push({
              message: "Data PSP tidak ditemukan. Silakan pilih PSP yang valid.",
              type: "error",
            });
          } else {
            push({
              message: `Gagal mengambil data PSP (${res.status}). Form dapat diisi manual.`,
              type: "info",
            });
          }
          return;
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.log("❌ Invalid response content type:", contentType);
          const textContent = await res.text();
          console.log("❌ Response content:", textContent.substring(0, 500));

          // Check if this is a redirect to login page
          if (textContent.includes("login") || textContent.includes("Login")) {
            push({
              message: "Session expired. Please refresh the page and try again.",
              type: "error",
            });
          } else {
            push({
              message: "Cannot auto-fill from API. Please fill the form manually.",
              type: "info",
            });
          }

          console.log("⚠️ Attempting manual fallback - checking URL parameters for data...");
          // Fallback: Try to get data from URL parameters or other sources
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const complaintIdFromUrl = urlParams.get("complaintId");
            if (complaintIdFromUrl) {
              setValue("caseId", complaintIdFromUrl, { shouldValidate: true });
              console.log("✅ Set Case ID from URL:", complaintIdFromUrl);
            }
          } catch (fallbackError) {
            console.log("❌ Fallback also failed:", fallbackError);
          }
          return;
        }

        const data = await res.json();
        console.log("📦 Complete PSP data received:", JSON.stringify(data, null, 2));

        // Ensure pspId is set in the form in case defaultValue was empty on first render
        setValue("pspId", id, { shouldValidate: true });
        console.log("✅ Set pspId to:", id);

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

        console.log("🔍 Extracted values:");
        console.log("  - Reporter:", reporter);
        console.log("  - Address:", address);
        console.log("  - Category:", jenis);
        console.log("  - Complaint ID:", compId);

        // Set values dengan logging untuk debugging
        if (reporter) {
          console.log("✅ Setting Nama Pelapor:", reporter);
          setValue("reporterName", reporter, { shouldValidate: true });
        } else {
          console.log("⚠️ No reporter name found in PSP data");
          console.log("  Available reporter fields:", {
            reporterName: data?.reporterName,
            customerName: data?.customerName,
            _complaintCustomerName: data?._complaintCustomerName,
          });
        }

        if (address) {
          console.log("✅ Setting Lokasi Gangguan:", address);
          setValue("disturbanceLocation", address, { shouldValidate: true });
        } else {
          console.log("⚠️ No address found in PSP data");
          console.log("  Available address fields:", {
            address: data?.address,
            _complaintAddress: data?._complaintAddress,
          });
        }

        if (jenis) {
          console.log("✅ Setting Jenis Gangguan:", jenis);
          setValue("disturbanceType", jenis, { shouldValidate: true });
        } else {
          console.log("⚠️ No disturbance type found in PSP data");
          console.log("  Available category field:", {
            _complaintCategory: data?._complaintCategory,
          });
        }

        // Set complaint ID from service request data or URL fallback
        if (compId) {
          setValue("caseId", compId, { shouldValidate: true });
          console.log("✅ Setting Case ID:", compId);
        } else {
          console.log("⚠️ No complaint ID found in PSP data");
          // Fallback: if PSP not linked to complaint, try complaintId from URL
          try {
            const q = new URLSearchParams(window.location.search);
            const fromUrl = q.get("complaintId");
            if (fromUrl) {
              setValue("caseId", fromUrl, { shouldValidate: true });
              console.log("✅ Setting Case ID from URL:", fromUrl);
            } else {
              console.log("⚠️ No complaintId found in URL either");
            }
          } catch (urlError) {
            console.log("⚠️ Error parsing URL:", urlError);
          }
        }

        // Only show success message if at least one field was filled
        if (reporter || address || jenis) {
          push({
            message:
              "Data nama pelapor, lokasi gangguan, dan jenis gangguan berhasil diisi otomatis dari PSP",
            type: "success",
          });
          console.log("🎉 Auto-fill SUCCESS!");
        } else {
          console.log("⚠️ Auto-fill INCOMPLETE - No fields were filled");
          console.log("Available data structure:", {
            hasReporterName: !!data?.reporterName,
            hasCustomerName: !!data?.customerName,
            hasAddress: !!data?.address,
            hasComplaintCategory: !!data?._complaintCategory,
            hasComplaintCustomerName: !!data?._complaintCustomerName,
            hasComplaintAddress: !!data?._complaintAddress,
            complaintId: data?._complaintId || "NULL",
          });
          push({
            message:
              "Data PSP ditemukan tetapi beberapa field kosong. Silakan lengkapi data yang tersisa secara manual.",
            type: "info",
          });
        }
      } catch (error: any) {
        console.error("❌ Error auto-filling SPK form:", error);

        // Handle different types of errors
        if (error.name === "AbortError") {
          push({
            message: "Timeout mengambil data PSP. Form dapat diisi manual.",
            type: "info",
          });
        } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
          push({
            message: "Masalah koneksi jaringan. Form dapat diisi manual.",
            type: "info",
          });
        } else {
          push({
            message: "Tidak dapat mengisi otomatis dari data PSP. Form dapat diisi manual.",
            type: "info",
          });
        }

        // Fallback: try to get complaintId from URL
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const complaintIdFromUrl = urlParams.get("complaintId");
          if (complaintIdFromUrl) {
            setValue("caseId", complaintIdFromUrl, { shouldValidate: true });
            console.log("✅ Fallback: Set Case ID from URL:", complaintIdFromUrl);
            push({
              message: "Case ID diisi dari URL parameter. Silakan lengkapi field lainnya.",
              type: "info",
            });
          }
        } catch (fallbackError) {
          console.log("❌ Fallback also failed:", fallbackError);
        }
      }
    })();
    // intentionally run once per serviceRequestId and when session changes
  }, [serviceRequestId, setValue, push, session]);

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
              Nama pelapor, lokasi gangguan, dan jenis gangguan akan diisi otomatis dari data PSP
              (ID: {serviceRequestId}).
            </span>
          </div>
          <div className="text-xs text-green-600 mt-1">
            💡 Jika field tidak terisi otomatis, periksa browser console (F12) untuk detail error.
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
          <label className="label">Jadwal Pekerjaan *</label>
          <input type="date" className="input" {...register("scheduledDate", { required: true })} />
          {errors.scheduledDate && (
            <div className="text-xs text-red-600">
              Tanggal jadwal wajib diisi dan tidak boleh lampau
            </div>
          )}
        </div>
        <div>
          <label className="label">Hari / Tanggal ditangani</label>
          <input type="date" className="input" {...register("handledDate")} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
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
          <p className="text-xs text-blue-600 mt-1">
            💡 Tips: Gunakan gambar berkualitas sedang (maks. 150KB) untuk hasil terbaik
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
          maxSizeKB={150} // Even smaller for database compatibility
        />
      </div>

      <div className="pt-2">
        <LoadingButton
          type="submit"
          loading={isSubmitting}
          loadingText="Menyimpan..."
          className="btn"
          disabled={isSubmitting}
        >
          Simpan SPK
        </LoadingButton>

        {errors.creatorSignature && (
          <p className="text-sm text-red-600 mt-2">⚠️ {errors.creatorSignature.message}</p>
        )}
      </div>
    </form>
  );
}
