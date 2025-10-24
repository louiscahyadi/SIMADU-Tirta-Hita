import { z } from "zod";

// SPK (Surat Perintah Kerja) – dibuat oleh Distribusi dari PSP
// Required fields (MVP):
// - caseId (hidden) uuid/string, required
// - pspId (hidden) uuid/string, required
// - teamName string, required, 2–100 chars
// - technicians string or array, required, 2–200 chars
// - scheduledDate date, required, >= today
// - instructions text, optional, max 2000 chars
// - workOrderNumber string, optional (let null; use system ID)

const techniciansUnion = z
  .union([z.string().trim().min(2).max(200), z.array(z.string().trim().min(1)).min(1)])
  .transform((v) => (Array.isArray(v) ? v.filter(Boolean).join(", ") : v));

export const workOrderSchema = z
  .object({
    caseId: z.string().min(1),
    pspId: z.string().min(1),
    teamName: z.string().trim().min(2).max(100),
    technicians: techniciansUnion,
    scheduledDate: z.coerce.date(),
    instructions: z.string().trim().max(2000).optional().or(z.literal("")),
    workOrderNumber: z.string().trim().max(100).optional(),
    // Tambahan field SPK sesuai kebutuhan UI Distribusi
    reportDate: z.coerce.date().optional(), // Lap. Hari / Tanggal
    reporterName: z.string().trim().min(2).max(100).optional(),
    disturbanceLocation: z.string().trim().min(2).max(255).optional(),
    handledDate: z.coerce.date().optional(), // Hari / Tanggal ditangani
    handlingTime: z.string().trim().max(100).optional(), // Waktu Penanganan
    disturbanceType: z.string().trim().max(100).optional(),
  })
  .superRefine((v, ctx) => {
    // scheduledDate must be today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sd = new Date(v.scheduledDate);
    if (sd < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledDate"],
        message: "Tanggal harus hari ini atau setelahnya",
      });
    }
  })
  .transform((v) => ({
    ...v,
    instructions: v.instructions ? v.instructions : undefined,
  }));

export type WorkOrderInput = z.infer<typeof workOrderSchema>;
