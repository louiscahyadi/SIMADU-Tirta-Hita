"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

interface SignatureUploadProps {
  value?: string; // Base64 image string
  onChange: (signature: string | null) => void;
  label?: string;
  required?: boolean;
  error?: string;
  maxSizeKB?: number; // Default 500KB
  acceptedFormats?: string[]; // Default: ['image/png', 'image/jpeg', 'image/jpg']
}

export default function SignatureUpload({
  value,
  onChange,
  label = "Tanda Tangan",
  required = false,
  error,
  maxSizeKB = 500,
  acceptedFormats = ["image/png", "image/jpeg", "image/jpg"],
}: SignatureUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Compress image if needed
  const compressImage = (file: File, maxWidth = 800, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new globalThis.Image();

      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Handle file processing
  const processFile = useCallback(
    async (file: File) => {
      setLoading(true);

      try {
        // Validate file type
        if (!acceptedFormats.includes(file.type)) {
          throw new Error(`Format file tidak didukung. Gunakan: ${acceptedFormats.join(", ")}`);
        }

        // Validate file size
        if (file.size > maxSizeKB * 1024) {
          throw new Error(`Ukuran file terlalu besar. Maksimal ${maxSizeKB}KB`);
        }

        // Process image
        let result: string;
        if (file.size > 100 * 1024) {
          // If > 100KB, compress
          result = await compressImage(file);
        } else {
          result = await fileToBase64(file);
        }

        onChange(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Gagal memproses file";
        // You might want to show this error via toast or prop
        console.error("SignatureUpload error:", message);
        alert(message); // Simple error handling, replace with your toast system
      } finally {
        setLoading(false);
      }
    },
    [acceptedFormats, maxSizeKB, onChange],
  );

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  // Handle drag & drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  // Handle camera capture (mobile)
  const handleCameraCapture = useCallback(() => {
    if (fileInputRef.current) {
      // Reset accept to allow camera
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.capture = "environment"; // Use rear camera
      fileInputRef.current.click();
    }
  }, []);

  // Handle file browser
  const handleFileBrowser = useCallback(() => {
    if (fileInputRef.current) {
      // Reset to normal file input
      fileInputRef.current.accept = acceptedFormats.join(",");
      fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
    }
  }, [acceptedFormats]);

  // Clear signature
  const handleClear = useCallback(() => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onChange]);

  return (
    <div className="space-y-3">
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={acceptedFormats.join(",")}
        onChange={handleFileChange}
      />

      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300"}
          ${loading ? "opacity-50 pointer-events-none" : "hover:border-gray-400"}
          ${error ? "border-red-300 bg-red-50" : ""}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {loading ? (
          <div className="space-y-2">
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-gray-300 rounded mx-auto mb-2"></div>
            </div>
            <p className="text-sm text-gray-600">Memproses gambar...</p>
          </div>
        ) : value ? (
          <div className="space-y-3">
            <div className="max-w-xs mx-auto">
              <div className="relative w-full h-32 border rounded-lg shadow-sm overflow-hidden">
                <Image
                  src={value}
                  alt="Tanda tangan"
                  fill
                  className="object-contain"
                  sizes="(max-width: 320px) 280px, 320px"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={handleClear}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={handleFileBrowser}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Ganti
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Upload gambar tanda tangan atau foto dari kamera
              </p>
              <div className="flex gap-2 justify-center">
                <button type="button" onClick={handleFileBrowser} className="btn-outline btn-sm">
                  📁 Pilih File
                </button>
                <button
                  type="button"
                  onClick={handleCameraCapture}
                  className="btn-outline btn-sm md:hidden" // Only show on mobile
                >
                  📷 Kamera
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              <p>Format: PNG, JPEG, JPG</p>
              <p>Maksimal: {maxSizeKB}KB</p>
              <p className="mt-1">
                💡 Tip: Foto tanda tangan di atas kertas putih untuk hasil terbaik
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Helper text */}
      <div className="text-xs text-gray-500">
        <p>🔒 Tanda tangan akan disimpan dengan aman dan dapat dilihat di dokumen SPK</p>
      </div>
    </div>
  );
}
