/**
 * Centralized error messages for consistent UI messaging across the application
 * All messages should be in Indonesian and follow consistent formatting patterns
 */

// Common timeout and network errors
export const COMMON_ERRORS = {
  TIMEOUT: "Permintaan melebihi batas waktu. Silakan coba lagi.",
  NETWORK_ERROR: "Terjadi kesalahan jaringan. Silakan periksa koneksi internet Anda.",
  UNKNOWN_ERROR: "Terjadi kesalahan tidak dikenal. Silakan coba lagi atau hubungi admin.",
  SAVE_FAILED: "Gagal menyimpan data. Silakan coba lagi.",
  LOAD_FAILED: "Gagal memuat data. Silakan refresh halaman.",
} as const;

// Authentication and authorization errors
export const AUTH_ERRORS = {
  LOGIN_REQUIRED: "Akses membutuhkan login.",
  ACCESS_DENIED: "Akses ditolak. Anda tidak memiliki izin untuk mengakses fitur ini.",
  SESSION_EXPIRED: "Sesi telah berakhir. Silakan login kembali.",
  INVALID_CREDENTIALS: "Username atau password tidak valid.",
} as const;

// Validation errors for forms
export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: "Field ini wajib diisi.",
  INVALID_FORMAT: "Format tidak valid.",
  PHONE_INVALID:
    "Nomor telepon tidak valid. Silakan periksa format: 08xx-xxxx-xxxx (mobile) atau 0xxx-xxxx-xxxx (telepon rumah).",
  PHONE_MIN_LENGTH: "Nomor telepon minimal 8 karakter.",
  PHONE_MAX_LENGTH: "Nomor telepon maksimal 20 karakter.",
  PHONE_FORMAT: "Nomor telepon hanya boleh berisi angka, +, dan spasi.",
  TIME_FORMAT: "Format jam harus HH:MM.",
  DATE_FUTURE: "Tanggal harus hari ini atau setelahnya.",
  TIME_END_BEFORE_START: "Waktu selesai harus sama atau setelah waktu mulai.",
  MIN_SELECTION: "Silakan pilih minimal satu item.",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  COMPLAINT_SAVED: "Pengaduan berhasil disimpan.",
  SERVICE_REQUEST_SAVED: "Permintaan service berhasil disimpan.",
  WORK_ORDER_SAVED:
    "SPK berhasil disimpan. Berita Acara akan dibuat setelah pekerjaan selesai di lapangan.",
  REPAIR_REPORT_SAVED: "Berita acara perbaikan berhasil disimpan.",
  DATA_UPDATED: "Data berhasil diperbarui.",
  DATA_DELETED: "Data berhasil dihapus.",
} as const;

// Specific business logic errors
export const BUSINESS_ERRORS = {
  INCOMPLETE_DATA: "Data tidak lengkap. Pastikan semua field yang wajib telah diisi.",
  CASE_ID_MISSING: "ID Kasus tidak ditemukan.",
  SPK_ID_MISSING: "ID SPK tidak ditemukan.",
  REPAIR_TYPES_REQUIRED: "Silakan pilih minimal satu jenis perbaikan untuk hasil FIXED/MONITORING.",
  NOT_FIXED_REASONS_REQUIRED: "Silakan pilih minimal satu alasan untuk hasil NOT_FIXED.",
  INVALID_CASE_PSP: "Kasus/PSP tidak valid.",
  DATA_NOT_FOUND: "Data tidak ditemukan.",
} as const;

// Form-specific error messages
export const FORM_ERRORS = {
  SERVICE_REQUEST: {
    SAVE_FAILED: "Gagal menyimpan permintaan service.",
    PHONE_INVALID: VALIDATION_ERRORS.PHONE_INVALID,
    TIME_FORMAT: VALIDATION_ERRORS.TIME_FORMAT,
  },
  WORK_ORDER: {
    SAVE_FAILED: "Gagal menyimpan SPK.",
    DATE_INVALID: VALIDATION_ERRORS.DATE_FUTURE,
  },
  REPAIR_REPORT: {
    SAVE_FAILED: "Gagal menyimpan berita acara perbaikan.",
    TIME_INVALID: VALIDATION_ERRORS.TIME_END_BEFORE_START,
  },
  COMPLAINT: {
    SEND_FAILED: "Gagal mengirim pengaduan. Mohon lengkapi data.",
  },
} as const;

// Export all error message types
export type CommonError = keyof typeof COMMON_ERRORS;
export type AuthError = keyof typeof AUTH_ERRORS;
export type ValidationError = keyof typeof VALIDATION_ERRORS;
export type SuccessMessage = keyof typeof SUCCESS_MESSAGES;
export type BusinessError = keyof typeof BUSINESS_ERRORS;

// Helper function to get error message by key
export function getErrorMessage(
  category: "common" | "auth" | "validation" | "business",
  key: string,
): string {
  switch (category) {
    case "common":
      return COMMON_ERRORS[key as CommonError] || COMMON_ERRORS.UNKNOWN_ERROR;
    case "auth":
      return AUTH_ERRORS[key as AuthError] || AUTH_ERRORS.ACCESS_DENIED;
    case "validation":
      return VALIDATION_ERRORS[key as ValidationError] || VALIDATION_ERRORS.INVALID_FORMAT;
    case "business":
      return BUSINESS_ERRORS[key as BusinessError] || BUSINESS_ERRORS.DATA_NOT_FOUND;
    default:
      return COMMON_ERRORS.UNKNOWN_ERROR;
  }
}

// Helper function to get success message by key
export function getSuccessMessage(key: SuccessMessage): string {
  return SUCCESS_MESSAGES[key] || SUCCESS_MESSAGES.DATA_UPDATED;
}
