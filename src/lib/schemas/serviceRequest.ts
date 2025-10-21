import { z } from "zod";

// PSP (Permintaan Service/Perbaikan) – dibuat oleh Humas
// Field spec (MVP):
// - caseId (hidden, optional; required only if created from existing complaint)
// - reporterName: string, required, 2–100 chars
// - reporterPhone: string, required, 8–20 chars, only '+', space, digits
// - address: string, required, 5–200 chars
// - description: text, required, 10–2000 chars
// - urgency: enum LOW | MEDIUM | HIGH, default MEDIUM, required
// - requestDate: date, default today, required
// - notes: string/text, optional, max 2000 chars

const phoneRegex = /^[+\d ]+$/; // allows +, digits, and spaces only

export const serviceRequestSchema = z
  .object({
    caseId: z.string().min(1).optional(),
    reporterName: z.string().trim().min(2).max(100),
    reporterPhone: z
      .string()
      .trim()
      .min(8, { message: "Minimal 8 karakter" })
      .max(20, { message: "Maksimal 20 karakter" })
      .regex(phoneRegex, { message: "Hanya boleh +, spasi, dan angka" }),
    address: z.string().trim().min(5).max(200),
    description: z.string().trim().min(10).max(2000),
    urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
    // Accept either Date or ISO/string and coerce to Date
    requestDate: z.coerce.date().default(() => new Date()),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .transform((v) => ({
    ...v,
    // normalize empty notes to undefined
    notes: v.notes ? v.notes : undefined,
  }));

export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;
