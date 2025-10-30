/**
 * Application-wide constants for SIMADU Tirta Hita
 */

/**
 * Complaint categories for water service issues
 * Used in public complaint form and internal processing
 */
export const COMPLAINT_CATEGORIES = [
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
  "water meter hilang",
  "water meter kabur",
  "water meter macet",
  "water meter pecah",
  "water meter rusak",
  "water meter tertimbun",
  "badan water meter bocor",
  "pemakaian tinggi",
  "air berbau",
] as const;

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

/**
 * Pagination defaults for list views
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 5,
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  // General API rate limit (per IP per minute)
  API: {
    REQUESTS: 60,
    WINDOW_MS: 60_000, // 1 minute
  },
  // Public complaint submission (per IP per 5 minutes)
  PUBLIC_COMPLAINT: {
    REQUESTS: 10,
    WINDOW_MS: 300_000, // 5 minutes
  },
} as const;

/**
 * Phone number validation patterns for Indonesia
 */
export const PHONE_PATTERNS = {
  // Mobile: 08xx-xxxx-xxxx (10-13 digits total)
  MOBILE: /^08\d{8,11}$/,
  // Landline: 0xxx-xxxx-xxxx (9-12 digits, starts with 02x or 03x etc)
  LANDLINE: /^0[2-9]\d{7,10}$/,
} as const;

/**
 * Service request reasons (from PSP form)
 */
export const SERVICE_REASONS = [
  "Bocor Pipa",
  "Bocor WM",
  "Bocor Lockable",
  "Air Mati",
  "Air Kecil",
  "Ganti WM",
  "Angkat WM",
  "Pasang WM",
] as const;

/**
 * Repair actions (from BAP form)
 */
export const REPAIR_ACTIONS = [
  "Ganti Pipa",
  "Ganti WM",
  "Ganti Lockable",
  "Perbaikan Pipa",
  "Perbaikan WM",
  "Buka Tutup Kran",
] as const;
