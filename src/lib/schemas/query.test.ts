import { describe, expect, test } from "vitest";

import { homeQuerySchema } from "./query";

describe("homeQuerySchema", () => {
  test("accepts valid flow values", () => {
    for (const flow of ["service", "workorder"] as const) {
      const res = homeQuerySchema.safeParse({ flow });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.flow).toBe(flow);
      }
    }
  });

  test("allows missing flow (server handles redirect)", () => {
    const res = homeQuerySchema.safeParse({});
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.flow).toBeUndefined();
    }
  });

  test("rejects invalid flow value", () => {
    const res = homeQuerySchema.safeParse({ flow: "invalid" });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "flow");
      expect(issue).toBeDefined();
    }
  });

  test("enforces non-empty IDs when provided", () => {
    const res = homeQuerySchema.safeParse({ serviceRequestId: "" });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "serviceRequestId");
      expect(issue).toBeDefined();
    }
  });

  test("passes with valid non-empty IDs", () => {
    const res = homeQuerySchema.safeParse({
      flow: "workorder",
      serviceRequestId: "sr_123",
      workOrderId: "wo_456",
      complaintId: "cmp_789",
    });
    expect(res.success).toBe(true);
  });
});
