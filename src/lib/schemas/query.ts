import { z } from "zod";

// Query parameters for homepage flow navigation
// - flow: which step to render; optional, but must be one of allowed when present
// - serviceRequestId, workOrderId, complaintId: optional but must be non-empty when provided

export const flowEnum = z.enum(["service", "workorder"], {
  required_error: "Parameter 'flow' wajib diisi.",
  invalid_type_error: "Parameter 'flow' tidak valid.",
});

const idParam = z
  .string({ invalid_type_error: "Parameter harus berupa teks." })
  .trim()
  .min(1, { message: "Tidak boleh kosong." });

export const homeQuerySchema = z
  .object({
    flow: flowEnum.optional(),
    serviceRequestId: idParam.optional(),
    workOrderId: idParam.optional(),
    complaintId: idParam.optional(),
  })
  .passthrough();

export type HomeQuery = z.infer<typeof homeQuerySchema>;
export type Flow = z.infer<typeof flowEnum>;
