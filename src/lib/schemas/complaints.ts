import { z } from "zod";

export const complaintCreateSchema = z.object({
  customerName: z.string().min(1, "Nama wajib diisi"),
  address: z.string().min(1, "Alamat wajib diisi"),
  mapsLink: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  connectionNumber: z.string().optional(),
  phone: z.string().optional(),
  complaintText: z.string().min(1, "Keluhan wajib diisi"),
  category: z.string().min(1, "Kategori wajib diisi"),
  processedAt: z.string().datetime().optional(),
});
export type ComplaintCreateInput = z.infer<typeof complaintCreateSchema>;

export const complaintQuerySchema = z.object({
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type ComplaintQuery = z.infer<typeof complaintQuerySchema>;

// For updating linkage and processedAt. All fields optional; only provided fields are applied.
// processedAt: ISO string to set a specific time, or null to unset. If undefined, leave unchanged.
export const complaintUpdateSchema = z.object({
  id: z.string().min(1).optional(),
  serviceRequestId: z.string().min(1).nullable().optional(),
  workOrderId: z.string().min(1).nullable().optional(),
  repairReportId: z.string().min(1).nullable().optional(),
  processedAt: z.union([z.string().datetime(), z.null()]).optional(),
});
export type ComplaintUpdateInput = z.infer<typeof complaintUpdateSchema>;
