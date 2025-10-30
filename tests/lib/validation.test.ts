import { describe, expect, it } from "vitest";

import { formatPhone, normalizePhone, parsePagination, validatePhone } from "@/lib/validation";

describe("Validation Utilities", () => {
  describe("normalizePhone", () => {
    it("should normalize Indonesian mobile number", () => {
      expect(normalizePhone("0812-3456-7890")).toBe("081234567890");
      expect(normalizePhone("0812 3456 7890")).toBe("081234567890");
    });

    it("should convert +62 to 0", () => {
      expect(normalizePhone("+628123456789")).toBe("08123456789");
      expect(normalizePhone("+62 812 3456 7890")).toBe("081234567890");
    });

    it("should handle 62 without plus", () => {
      expect(normalizePhone("628123456789")).toBe("08123456789");
    });

    it("should return undefined for empty input", () => {
      expect(normalizePhone("")).toBeUndefined();
      expect(normalizePhone(null)).toBeUndefined();
      expect(normalizePhone(undefined)).toBeUndefined();
    });
  });

  describe("validatePhone", () => {
    it("should validate mobile numbers", () => {
      expect(validatePhone("08123456789")).toBe(true);
      expect(validatePhone("081234567890")).toBe(true);
      expect(validatePhone("0812-3456-7890")).toBe(true);
    });

    it("should validate landline numbers", () => {
      expect(validatePhone("02112345678")).toBe(true);
      expect(validatePhone("021-1234-5678")).toBe(true);
      expect(validatePhone("0361123456")).toBe(true);
    });

    it("should accept empty value (optional field)", () => {
      expect(validatePhone("")).toBe(true);
      expect(validatePhone(undefined)).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(validatePhone("123456")).toContain("tidak valid");
      expect(validatePhone("abcd")).toContain("tidak valid");
      expect(validatePhone("0712345")).toContain("tidak valid");
    });

    it("should handle international format", () => {
      expect(validatePhone("+628123456789")).toBe(true);
    });
  });

  describe("formatPhone", () => {
    it("should format mobile numbers", () => {
      expect(formatPhone("08123456789")).toBe("0812-3456-789");
    });

    it("should format Jakarta landline", () => {
      expect(formatPhone("02112345678")).toBe("021-1234-5678");
    });

    it("should return - for empty input", () => {
      expect(formatPhone("")).toBe("-");
      expect(formatPhone(null)).toBe("-");
      expect(formatPhone(undefined)).toBe("-");
    });

    it("should handle already formatted numbers", () => {
      const formatted = formatPhone("0812-3456-7890");
      expect(formatted).toContain("0812");
    });
  });

  describe("parsePagination", () => {
    it("should parse valid pagination params", () => {
      const result = parsePagination(2, 50);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(50);
      expect(result.skip).toBe(50); // (2-1) * 50
      expect(result.take).toBe(50);
    });

    it("should use defaults for invalid params", () => {
      const result = parsePagination(null, null);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20); // default
    });

    it("should enforce max page size", () => {
      const result = parsePagination(1, 500);
      expect(result.pageSize).toBe(100); // max limit
    });

    it("should handle negative page numbers", () => {
      const result = parsePagination(-5, 20);
      expect(result.page).toBe(1); // minimum
    });

    it("should handle string inputs", () => {
      const result = parsePagination("3", "25");
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(25);
    });

    it("should calculate skip correctly", () => {
      const result1 = parsePagination(1, 20);
      expect(result1.skip).toBe(0); // (1-1) * 20

      const result2 = parsePagination(3, 20);
      expect(result2.skip).toBe(40); // (3-1) * 20
    });

    it("should use custom defaults", () => {
      const result = parsePagination(null, null, {
        page: 1,
        pageSize: 10,
        maxPageSize: 50,
      });
      expect(result.pageSize).toBe(10);
    });
  });
});
