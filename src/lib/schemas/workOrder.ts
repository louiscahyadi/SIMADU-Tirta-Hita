import { z } from "zod";

export const workOrderSchema = z.object({
  reportDate: z.string().optional(),
  number: z.string().optional(),
  handledDate: z.string().optional(),
  reporterName: z.string().optional(),
  handlingTime: z.string().optional(),
  disturbanceLocation: z.string().optional(),
  disturbanceType: z.string().optional(),
  city: z.string().optional(),
  cityDate: z.string().optional(),
  executorName: z.string().optional(),
  team: z.string().optional(),
  serviceRequestId: z.string().optional(),
});
export type WorkOrderInput = z.infer<typeof workOrderSchema>;
