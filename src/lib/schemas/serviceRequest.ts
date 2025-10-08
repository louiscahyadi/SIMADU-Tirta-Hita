import { z } from "zod";

export const serviceRequestSchema = z.object({
  customerName: z.string().min(1),
  address: z.string().min(1),
  serviceNumber: z.string().optional(),
  phone: z.string().optional(),
  receivedAt: z.string().optional(),
  receivedBy: z.string().optional(),
  handledAt: z.string().optional(),
  handlerName: z.string().optional(),
  inspectedAt: z.string().optional(),
  inspectorName: z.string().optional(),
  reasons: z.array(z.string()).default([]),
  otherReason: z.string().optional(),
  actionTaken: z.string().optional(),
  serviceCostBy: z.enum(["PERUMDA AM", "Langganan"]).optional(),
  handoverReceiver: z.string().optional(),
  handoverCustomer: z.string().optional(),
  handoverAt: z.string().optional(),
});
export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;
