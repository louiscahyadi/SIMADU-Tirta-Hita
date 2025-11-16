import { z } from "zod";

import { VALIDATION_ERRORS } from "../errorMessages";

// BAP (Berita Acara Perbaikan)
// Required fields:
// - caseId (hidden) uuid/string, required
// - spkId (hidden) uuid/string, required
// - repairTypes array of strings, jenis perbaikan yang dilakukan
// - otherRepairType string, jenis perbaikan lainnya
// - notHandledReasons array of strings, alasan tidak ditangani
// - otherNotHandledReason string, alasan lain tidak ditangani
// - startTime datetime, required
// - endTime datetime, required, >= startTime
// - result enum: FIXED | NOT_FIXED, required
// - city, executorName, team - info pelaksana

export const repairReportSchema = z
  .object({
    caseId: z.string().min(1),
    spkId: z.string().min(1),
    repairTypes: z.array(z.string()).default([]),
    otherRepairType: z.string().trim().max(200).optional().or(z.literal("")),
    notHandledReasons: z.array(z.string()).default([]),
    otherNotHandledReason: z.string().trim().max(200).optional().or(z.literal("")),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    result: z.enum(["FIXED", "NOT_FIXED"]),
    city: z.string().trim().max(100).optional().or(z.literal("")),
    executorName: z.string().trim().max(100).optional().or(z.literal("")),
    team: z.string().trim().max(100).optional().or(z.literal("")),
    executorSignature: z.string().min(1, "Tanda tangan pelaksana wajib diisi"),
  })
  .superRefine((v, ctx) => {
    const start = new Date(v.startTime);
    const end = new Date(v.endTime);
    if (isFinite(start.getTime()) && isFinite(end.getTime())) {
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: VALIDATION_ERRORS.TIME_END_BEFORE_START,
        });
      }
    }
  })
  .transform((v) => ({
    ...v,
    otherRepairType: v.otherRepairType ? v.otherRepairType : undefined,
    otherNotHandledReason: v.otherNotHandledReason ? v.otherNotHandledReason : undefined,
    city: v.city ? v.city : undefined,
    executorName: v.executorName ? v.executorName : undefined,
    team: v.team ? v.team : undefined,
    executorSignature: v.executorSignature,
  }));

export type RepairReportInput = z.infer<typeof repairReportSchema>;
