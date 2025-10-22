import { z } from "zod";

// BAP (Berita Acara Perbaikan)
// Required fields:
// - caseId (hidden) uuid/string, required
// - spkId (hidden) uuid/string, required
// - actionTaken text, required, 10–4000 chars
// - startTime datetime, required
// - endTime datetime, required, >= startTime
// - result enum: FIXED | MONITORING | NOT_FIXED, required
// - remarks text, optional, max 2000 chars
// - customerConfirmationName string, optional, 2–100 chars

export const repairReportSchema = z
  .object({
    caseId: z.string().min(1),
    spkId: z.string().min(1),
    actionTaken: z.string().trim().min(10).max(4000),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    result: z.enum(["FIXED", "MONITORING", "NOT_FIXED"]),
    remarks: z.string().trim().max(2000).optional().or(z.literal("")),
    customerConfirmationName: z.string().trim().min(2).max(100).optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    const start = new Date(v.startTime);
    const end = new Date(v.endTime);
    if (isFinite(start.getTime()) && isFinite(end.getTime())) {
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: "Waktu selesai harus >= waktu mulai",
        });
      }
    }
  })
  .transform((v) => ({
    ...v,
    remarks: v.remarks ? v.remarks : undefined,
    customerConfirmationName: v.customerConfirmationName ? v.customerConfirmationName : undefined,
  }));

export type RepairReportInput = z.infer<typeof repairReportSchema>;
