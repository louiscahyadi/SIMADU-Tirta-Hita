import { z } from "zod";

export const repairReportSchema = z.object({
  actions: z.array(z.string()).default([]),
  otherActions: z.string().optional(),
  notHandledReasons: z.array(z.string()).default([]),
  otherNotHandled: z.string().optional(),
  city: z.string().optional(),
  cityDate: z.string().optional(),
  executorName: z.string().optional(),
  team: z.string().optional(),
  authorizedBy: z.string().optional(),
  workOrderId: z.string().optional(),
});
export type RepairReportInput = z.infer<typeof repairReportSchema>;
