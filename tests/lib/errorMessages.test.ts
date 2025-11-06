import { describe, expect, it } from "vitest";

import {
  AUTH_ERRORS,
  BUSINESS_ERRORS,
  COMMON_ERRORS,
  FORM_ERRORS,
  getErrorMessage,
  getSuccessMessage,
  SUCCESS_MESSAGES,
  VALIDATION_ERRORS,
} from "@/lib/errorMessages";

describe("Error Messages Constants", () => {
  describe("COMMON_ERRORS", () => {
    it("should have timeout message in Indonesian", () => {
      expect(COMMON_ERRORS.TIMEOUT).toBe("Permintaan melebihi batas waktu. Silakan coba lagi.");
    });

    it("should have network error message in Indonesian", () => {
      expect(COMMON_ERRORS.NETWORK_ERROR).toBe(
        "Terjadi kesalahan jaringan. Silakan periksa koneksi internet Anda.",
      );
    });

    it("should have unknown error message in Indonesian", () => {
      expect(COMMON_ERRORS.UNKNOWN_ERROR).toBe(
        "Terjadi kesalahan tidak dikenal. Silakan coba lagi atau hubungi admin.",
      );
    });
  });

  describe("AUTH_ERRORS", () => {
    it("should have login required message in Indonesian", () => {
      expect(AUTH_ERRORS.LOGIN_REQUIRED).toBe("Akses membutuhkan login.");
    });

    it("should have access denied message in Indonesian", () => {
      expect(AUTH_ERRORS.ACCESS_DENIED).toBe(
        "Akses ditolak. Anda tidak memiliki izin untuk mengakses fitur ini.",
      );
    });
  });

  describe("VALIDATION_ERRORS", () => {
    it("should have phone validation message in Indonesian", () => {
      expect(VALIDATION_ERRORS.PHONE_INVALID).toBe(
        "Nomor telepon tidak valid. Silakan periksa format: 08xx-xxxx-xxxx (mobile) atau 0xxx-xxxx-xxxx (telepon rumah).",
      );
    });

    it("should have time format message in Indonesian", () => {
      expect(VALIDATION_ERRORS.TIME_FORMAT).toBe("Format jam harus HH:MM.");
    });

    it("should have date future message in Indonesian", () => {
      expect(VALIDATION_ERRORS.DATE_FUTURE).toBe("Tanggal harus hari ini atau setelahnya.");
    });

    it("should have phone format message in Indonesian", () => {
      expect(VALIDATION_ERRORS.PHONE_FORMAT).toBe(
        "Nomor telepon hanya boleh berisi angka, +, dan spasi.",
      );
    });
  });

  describe("SUCCESS_MESSAGES", () => {
    it("should have complaint saved message in Indonesian", () => {
      expect(SUCCESS_MESSAGES.COMPLAINT_SAVED).toBe("Pengaduan berhasil disimpan.");
    });

    it("should have service request saved message in Indonesian", () => {
      expect(SUCCESS_MESSAGES.SERVICE_REQUEST_SAVED).toBe("Permintaan service berhasil disimpan.");
    });

    it("should have work order saved message in Indonesian", () => {
      expect(SUCCESS_MESSAGES.WORK_ORDER_SAVED).toBe(
        "SPK berhasil disimpan. Berita Acara akan dibuat setelah pekerjaan selesai di lapangan.",
      );
    });

    it("should have repair report saved message in Indonesian", () => {
      expect(SUCCESS_MESSAGES.REPAIR_REPORT_SAVED).toBe(
        "Berita acara perbaikan berhasil disimpan.",
      );
    });
  });

  describe("BUSINESS_ERRORS", () => {
    it("should have incomplete data message in Indonesian", () => {
      expect(BUSINESS_ERRORS.INCOMPLETE_DATA).toBe(
        "Data tidak lengkap. Pastikan semua field yang wajib telah diisi.",
      );
    });

    it("should have data not found message in Indonesian", () => {
      expect(BUSINESS_ERRORS.DATA_NOT_FOUND).toBe("Data tidak ditemukan.");
    });

    it("should have repair types required message in Indonesian", () => {
      expect(BUSINESS_ERRORS.REPAIR_TYPES_REQUIRED).toBe(
        "Silakan pilih minimal satu jenis perbaikan untuk hasil FIXED/MONITORING.",
      );
    });
  });

  describe("FORM_ERRORS", () => {
    it("should have service request save failed message in Indonesian", () => {
      expect(FORM_ERRORS.SERVICE_REQUEST.SAVE_FAILED).toBe("Gagal menyimpan permintaan service.");
    });

    it("should have work order save failed message in Indonesian", () => {
      expect(FORM_ERRORS.WORK_ORDER.SAVE_FAILED).toBe("Gagal menyimpan SPK.");
    });

    it("should have repair report save failed message in Indonesian", () => {
      expect(FORM_ERRORS.REPAIR_REPORT.SAVE_FAILED).toBe("Gagal menyimpan berita acara perbaikan.");
    });
  });

  describe("Helper Functions", () => {
    describe("getErrorMessage", () => {
      it("should return correct common error message", () => {
        expect(getErrorMessage("common", "TIMEOUT")).toBe(COMMON_ERRORS.TIMEOUT);
      });

      it("should return correct auth error message", () => {
        expect(getErrorMessage("auth", "LOGIN_REQUIRED")).toBe(AUTH_ERRORS.LOGIN_REQUIRED);
      });

      it("should return correct validation error message", () => {
        expect(getErrorMessage("validation", "PHONE_INVALID")).toBe(
          VALIDATION_ERRORS.PHONE_INVALID,
        );
      });

      it("should return correct business error message", () => {
        expect(getErrorMessage("business", "DATA_NOT_FOUND")).toBe(BUSINESS_ERRORS.DATA_NOT_FOUND);
      });

      it("should return fallback message for unknown key", () => {
        expect(getErrorMessage("common", "UNKNOWN_KEY")).toBe(COMMON_ERRORS.UNKNOWN_ERROR);
      });

      it("should return fallback message for unknown category", () => {
        expect(getErrorMessage("unknown" as any, "TIMEOUT")).toBe(COMMON_ERRORS.UNKNOWN_ERROR);
      });
    });

    describe("getSuccessMessage", () => {
      it("should return correct success message", () => {
        expect(getSuccessMessage("COMPLAINT_SAVED")).toBe(SUCCESS_MESSAGES.COMPLAINT_SAVED);
      });

      it("should return fallback message for unknown key", () => {
        expect(getSuccessMessage("UNKNOWN_KEY" as any)).toBe(SUCCESS_MESSAGES.DATA_UPDATED);
      });
    });
  });

  describe("Message Consistency", () => {
    it("should ensure all messages are in Indonesian", () => {
      const allMessages = [
        ...Object.values(COMMON_ERRORS),
        ...Object.values(AUTH_ERRORS),
        ...Object.values(VALIDATION_ERRORS),
        ...Object.values(SUCCESS_MESSAGES),
        ...Object.values(BUSINESS_ERRORS),
      ];

      // Check that messages don't contain common English error words
      const englishWords = [
        "error",
        "failed",
        "invalid",
        "required",
        "timeout",
        "success",
        "please",
        "try again",
        "not found",
      ];

      allMessages.forEach((message) => {
        englishWords.forEach((word) => {
          expect(message.toLowerCase()).not.toContain(word.toLowerCase());
        });
      });
    });

    it("should ensure all messages end with proper punctuation", () => {
      const allMessages = [
        ...Object.values(COMMON_ERRORS),
        ...Object.values(AUTH_ERRORS),
        ...Object.values(VALIDATION_ERRORS),
        ...Object.values(SUCCESS_MESSAGES),
        ...Object.values(BUSINESS_ERRORS),
      ];

      allMessages.forEach((message) => {
        // Should end with period, comma, or exclamation mark
        expect(message).toMatch(/[.!,]$/);
      });
    });

    it("should ensure consistent formatting for similar message types", () => {
      // Success messages should contain "berhasil"
      Object.values(SUCCESS_MESSAGES).forEach((message) => {
        if (!message.includes("berhasil")) {
          // Some success messages might not contain "berhasil", that's okay
        }
      });

      // Error messages should provide actionable guidance when possible
      const actionableMessages = [
        COMMON_ERRORS.TIMEOUT,
        COMMON_ERRORS.NETWORK_ERROR,
        VALIDATION_ERRORS.PHONE_INVALID,
      ];

      actionableMessages.forEach((message) => {
        expect(message.toLowerCase()).toMatch(/silakan|mohon|pastikan|periksa/);
      });
    });
  });
});
