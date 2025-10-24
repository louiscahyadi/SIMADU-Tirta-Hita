import { z } from "zod";

// PSP (Permintaan Service/Perbaikan) – dibuat oleh Humas
// Field spec (updated):
// - caseId (optional)
// - serviceNumber (No. SL, optional)
// - reporterName (Nama Pelanggan): string, 2–100 chars
// - reporterPhone (No Kontak): string, 8–20 chars, only '+', space, digits
// - address (Alamat): string, 5–200 chars
// - receivedAt (Diterima: Hari/Tanggal + Jam; optional) & receivedBy (Petugas Jaga; optional)
// - reasons (Alasan Permintaan Service): string[] optional
// - otherReason (Lain-lain): optional
// - serviceCostBy: 'PERUMDA AM' | 'Langganan' (optional)
// - description: optional text, up to 2000 chars (legacy, can be omitted)
// - requestDate: date, default today
// - urgency: enum LOW | MEDIUM | HIGH, default MEDIUM
// - notes: optional, up to 2000 chars

const phoneRegex = /^[+\d ]+$/; // allows +, digits, and spaces only

export const serviceRequestSchema = z
  .object({
    caseId: z.string().min(1).optional(),
    serviceNumber: z.string().trim().max(50).optional(),
    reporterName: z.string().trim().min(2).max(100),
    reporterPhone: z
      .string()
      .trim()
      .min(8, { message: "Minimal 8 karakter" })
      .max(20, { message: "Maksimal 20 karakter" })
      .regex(phoneRegex, { message: "Hanya boleh +, spasi, dan angka" }),
    address: z.string().trim().min(5).max(200),
    receivedAt: z.coerce.date().optional(),
    receivedBy: z.string().trim().min(2).max(100).optional(),
    reasons: z.array(z.string().trim()).optional(),
    otherReason: z.string().trim().max(200).optional(),
    serviceCostBy: z.enum(["PERUMDA AM", "Langganan"]).optional(),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    urgency: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
    // Accept either Date or ISO/string and coerce to Date
    requestDate: z.coerce.date().default(() => new Date()),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .transform((v) => ({
    ...v,
    // normalize empty notes to undefined
    notes: v.notes ? v.notes : undefined,
    description: v.description ? v.description : undefined,
  }));

export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;
