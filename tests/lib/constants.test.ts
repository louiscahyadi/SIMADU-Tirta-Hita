import { describe, expect, it } from "vitest";

import { COMPLAINT_CATEGORIES, PAGINATION, PHONE_PATTERNS, RATE_LIMITS } from "@/lib/constants";

describe("Constants", () => {
  describe("COMPLAINT_CATEGORIES", () => {
    it("should have 29 categories", () => {
      expect(COMPLAINT_CATEGORIES).toHaveLength(29);
    });

    it("should include common categories", () => {
      expect(COMPLAINT_CATEGORIES).toContain("pipa bocor");
      expect(COMPLAINT_CATEGORIES).toContain("air keruh");
      expect(COMPLAINT_CATEGORIES).toContain("water meter rusak");
      expect(COMPLAINT_CATEGORIES).toContain("water meter hilang");
    });

    it("should not have duplicates", () => {
      const uniqueCategories = new Set(COMPLAINT_CATEGORIES);
      expect(uniqueCategories.size).toBe(COMPLAINT_CATEGORIES.length);
    });

    it("should not contain 'hialng' typo", () => {
      expect(COMPLAINT_CATEGORIES).not.toContain("hialng");
      expect(COMPLAINT_CATEGORIES).toContain("water meter hilang");
    });

    it("should not have empty strings", () => {
      const hasEmpty = COMPLAINT_CATEGORIES.some((cat) => cat.trim() === "");
      expect(hasEmpty).toBe(false);
    });
  });

  describe("PAGINATION", () => {
    it("should have valid default values", () => {
      expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(20);
      expect(PAGINATION.MAX_PAGE_SIZE).toBe(100);
      expect(PAGINATION.MIN_PAGE_SIZE).toBe(5);
    });

    it("should have max greater than default", () => {
      expect(PAGINATION.MAX_PAGE_SIZE).toBeGreaterThan(PAGINATION.DEFAULT_PAGE_SIZE);
    });

    it("should have positive values", () => {
      expect(PAGINATION.DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
      expect(PAGINATION.MAX_PAGE_SIZE).toBeGreaterThan(0);
      expect(PAGINATION.MIN_PAGE_SIZE).toBeGreaterThan(0);
    });
  });

  describe("RATE_LIMITS", () => {
    it("should have API limits", () => {
      expect(RATE_LIMITS.API.REQUESTS).toBeDefined();
      expect(RATE_LIMITS.API.WINDOW_MS).toBeDefined();
    });

    it("should have Public Complaint limits", () => {
      expect(RATE_LIMITS.PUBLIC_COMPLAINT.REQUESTS).toBeDefined();
      expect(RATE_LIMITS.PUBLIC_COMPLAINT.WINDOW_MS).toBeDefined();
    });

    it("should have stricter public complaint limits", () => {
      expect(RATE_LIMITS.PUBLIC_COMPLAINT.REQUESTS).toBeLessThan(RATE_LIMITS.API.REQUESTS);
    });

    it("should have valid request and window values", () => {
      expect(RATE_LIMITS.API.REQUESTS).toBeGreaterThan(0);
      expect(RATE_LIMITS.API.WINDOW_MS).toBeGreaterThan(0);
      expect(RATE_LIMITS.PUBLIC_COMPLAINT.REQUESTS).toBeGreaterThan(0);
      expect(RATE_LIMITS.PUBLIC_COMPLAINT.WINDOW_MS).toBeGreaterThan(0);
    });
  });

  describe("PHONE_PATTERNS", () => {
    it("should have MOBILE pattern", () => {
      expect(PHONE_PATTERNS.MOBILE).toBeInstanceOf(RegExp);
    });

    it("should have LANDLINE pattern", () => {
      expect(PHONE_PATTERNS.LANDLINE).toBeInstanceOf(RegExp);
    });

    it("should match valid mobile numbers", () => {
      expect(PHONE_PATTERNS.MOBILE.test("08123456789")).toBe(true);
      expect(PHONE_PATTERNS.MOBILE.test("081234567890")).toBe(true);
    });

    it("should match valid landline numbers", () => {
      expect(PHONE_PATTERNS.LANDLINE.test("02112345678")).toBe(true);
      expect(PHONE_PATTERNS.LANDLINE.test("0361123456")).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(PHONE_PATTERNS.MOBILE.test("123456")).toBe(false);
      expect(PHONE_PATTERNS.LANDLINE.test("99912345678")).toBe(false);
    });
  });
});
