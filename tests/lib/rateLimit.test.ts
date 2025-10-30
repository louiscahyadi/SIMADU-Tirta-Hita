import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { applyRateLimit } from "@/lib/rateLimit";

describe("Rate Limiting", () => {
  describe("applyRateLimit", () => {
    const createMockRequest = (pathname: string, ip?: string): NextRequest => {
      const url = `http://localhost:3000${pathname}`;
      const headers = new Headers();
      if (ip) {
        headers.set("x-forwarded-for", ip);
      }

      return new NextRequest(url, { headers });
    };

    it("should allow requests within limit", async () => {
      const req = createMockRequest("/api/test", "1.2.3.4");

      const result1 = await applyRateLimit(req, {
        limit: 3,
        windowMs: 60000,
      });
      const result2 = await applyRateLimit(req, {
        limit: 3,
        windowMs: 60000,
      });

      expect(result1).toBeNull(); // Allowed
      expect(result2).toBeNull(); // Allowed
    });

    it("should return 429 when rate limit exceeded", async () => {
      const req = createMockRequest("/api/test", "1.2.3.5");

      // Make requests up to limit
      await applyRateLimit(req, { limit: 2, windowMs: 1000 });
      await applyRateLimit(req, { limit: 2, windowMs: 1000 });

      // This should be rate limited
      const result = await applyRateLimit(req, { limit: 2, windowMs: 1000 });

      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);
    });

    it("should include rate limit headers in response", async () => {
      const req = createMockRequest("/api/test", "1.2.3.6");

      // Exceed limit
      await applyRateLimit(req, { limit: 1, windowMs: 1000 });
      const result = await applyRateLimit(req, { limit: 1, windowMs: 1000 });

      expect(result?.headers.get("X-RateLimit-Limit")).toBe("1");
      expect(result?.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(result?.headers.get("Retry-After")).toBeDefined();
    });

    it("should use custom error message", async () => {
      const req = createMockRequest("/api/test", "1.2.3.7");
      const customMessage = "Custom rate limit message";

      await applyRateLimit(req, { limit: 1, windowMs: 1000 });
      const result = await applyRateLimit(req, {
        limit: 1,
        windowMs: 1000,
        message: customMessage,
      });

      expect(result).not.toBeNull();
      const body = await result?.text();
      expect(body).toBe(customMessage);
    });

    it("should isolate different IPs", async () => {
      const req1 = createMockRequest("/api/test", "1.2.3.8");
      const req2 = createMockRequest("/api/test", "1.2.3.9");

      // Exhaust limit for IP1
      await applyRateLimit(req1, { limit: 1, windowMs: 1000 });
      const result1 = await applyRateLimit(req1, { limit: 1, windowMs: 1000 });
      expect(result1?.status).toBe(429);

      // IP2 should still be allowed
      const result2 = await applyRateLimit(req2, { limit: 1, windowMs: 1000 });
      expect(result2).toBeNull();
    });

    it("should isolate different paths", async () => {
      const req1 = createMockRequest("/api/path1", "1.2.3.10");
      const req2 = createMockRequest("/api/path2", "1.2.3.10");

      // Exhaust limit for path1
      await applyRateLimit(req1, { limit: 1, windowMs: 1000 });
      const result1 = await applyRateLimit(req1, { limit: 1, windowMs: 1000 });
      expect(result1?.status).toBe(429);

      // Same IP but different path should be allowed
      const result2 = await applyRateLimit(req2, { limit: 1, windowMs: 1000 });
      expect(result2).toBeNull();
    });

    it("should handle missing IP gracefully", async () => {
      const req = createMockRequest("/api/test"); // No IP header

      const result = await applyRateLimit(req, {
        limit: 5,
        windowMs: 1000,
      });

      expect(result).toBeNull(); // Should still work
    });

    it("should reset after window expires", async () => {
      const req = createMockRequest("/api/test", "1.2.3.11");

      // Exhaust limit
      await applyRateLimit(req, { limit: 1, windowMs: 100 });
      const result1 = await applyRateLimit(req, { limit: 1, windowMs: 100 });
      expect(result1?.status).toBe(429);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed again
      const result2 = await applyRateLimit(req, { limit: 1, windowMs: 100 });
      expect(result2).toBeNull();
    });
  });
});
