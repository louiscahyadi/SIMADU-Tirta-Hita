import { PHONE_PATTERNS } from "./constants";

/**
 * Normalize Indonesian phone number
 * - Remove spaces, dashes, parentheses
 * - Convert +62 to 0
 * @param rawPhone - Raw phone input from user
 * @returns Normalized phone number or undefined if empty
 */
export function normalizePhone(rawPhone?: string | null): string | undefined {
  if (!rawPhone) return undefined;

  // Remove all non-digit characters except +
  let normalized = String(rawPhone).replace(/[\s\-()]/g, "");

  // Convert international format to local
  if (normalized.startsWith("+62")) {
    normalized = "0" + normalized.slice(3);
  } else if (normalized.startsWith("62") && normalized.length > 10) {
    // Handle 628xxx format (international without +)
    normalized = "0" + normalized.slice(2);
  }

  return normalized.length ? normalized : undefined;
}

/**
 * Validate Indonesian phone number (mobile or landline)
 * @param value - Phone number to validate
 * @returns True if valid, error message if invalid
 */
export function validatePhone(value?: string): true | string {
  if (!value) return true; // Optional field

  const normalized = normalizePhone(value);
  if (!normalized) return true;

  // Check against mobile pattern
  if (PHONE_PATTERNS.MOBILE.test(normalized)) {
    return true;
  }

  // Check against landline pattern
  if (PHONE_PATTERNS.LANDLINE.test(normalized)) {
    return true;
  }

  return "Nomor tidak valid. Format: 08xx-xxxx-xxxx (mobile) atau 0xxx-xxxx-xxxx (telepon rumah)";
}

/**
 * Format phone number for display
 * @param phone - Phone number to format
 * @returns Formatted phone number
 */
export function formatPhone(phone?: string | null): string {
  if (!phone) return "-";

  const normalized = normalizePhone(phone);
  if (!normalized) return phone;

  // Format mobile: 0812-3456-7890
  if (PHONE_PATTERNS.MOBILE.test(normalized)) {
    return normalized.replace(/^(\d{4})(\d{4})(\d+)$/, "$1-$2-$3");
  }

  // Format landline: 021-1234-5678
  if (normalized.startsWith("021") || normalized.startsWith("022")) {
    return normalized.replace(/^(\d{3})(\d{4})(\d+)$/, "$1-$2-$3");
  }

  // Format other landlines: 0361-123456
  if (PHONE_PATTERNS.LANDLINE.test(normalized)) {
    return normalized.replace(/^(\d{4})(\d+)$/, "$1-$2");
  }

  return normalized;
}

/**
 * Parse pagination parameters with defaults and limits
 * @param page - Page number from query
 * @param pageSize - Page size from query
 * @param defaults - Default values
 * @returns Parsed and validated pagination params
 */
export function parsePagination(
  page?: string | number | null,
  pageSize?: string | number | null,
  defaults = { page: 1, pageSize: 20, maxPageSize: 100 },
) {
  const parsedPage = Math.max(1, parseInt(String(page || defaults.page), 10) || defaults.page);
  const parsedSize = Math.min(
    defaults.maxPageSize,
    Math.max(1, parseInt(String(pageSize || defaults.pageSize), 10) || defaults.pageSize),
  );

  return {
    page: parsedPage,
    pageSize: parsedSize,
    skip: (parsedPage - 1) * parsedSize,
    take: parsedSize,
  };
}
