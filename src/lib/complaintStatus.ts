import type { Prisma } from "@prisma/client";

// Narrow string union mirroring Prisma enum to avoid importing enums everywhere
export type CaseStatusType =
  | "REPORTED"
  | "PSP_CREATED"
  | "SPK_CREATED"
  | "RR_CREATED"
  | "COMPLETED"
  | "MONITORING";

type Tx = Prisma.TransactionClient;

export interface UpdateStatusOptions {
  note?: string | null;
  actorRole: string; // e.g., "humas" | "distribusi" | "public"
  actorId?: string | null; // user id (sub)
  // Optionally update linkage fields in the same transaction when status changes
  link?: {
    serviceRequestId?: string | null;
    workOrderId?: string | null;
    repairReportId?: string | null;
    processedAt?: Date | string | null;
  };
}

/**
 * Atomically updates Complaint.status and writes a StatusHistory row.
 * Use inside an existing transaction.
 */
export async function updateComplaintStatus(
  tx: Tx,
  complaintId: string,
  status: CaseStatusType,
  opts: UpdateStatusOptions,
) {
  // Update complaint status (+ optional links)
  await tx.complaint.update({
    where: { id: complaintId },
    data: {
      status: status as any,
      // Cast to any to allow scalar id updates in Unchecked update
      ...(opts.link as any),
    },
  });

  // Record history
  await tx.statusHistory.create({
    data: {
      complaintId,
      status: status as any,
      actorRole: opts.actorRole,
      actorId: opts.actorId ?? null,
      note: opts.note ?? null,
    },
  });
}

/** Convenience helpers for common transitions */
export const ComplaintFlow = {
  async markReported(
    tx: Tx,
    complaintId: string,
    opts: Omit<UpdateStatusOptions, "link"> & { note?: string | null },
  ) {
    await updateComplaintStatus(tx, complaintId, "REPORTED", opts);
  },

  async markPSPCreated(
    tx: Tx,
    complaintId: string,
    serviceRequestId: string,
    opts: Omit<UpdateStatusOptions, "link"> & { note?: string | null },
  ) {
    await updateComplaintStatus(tx, complaintId, "PSP_CREATED", {
      ...opts,
      link: { serviceRequestId, processedAt: new Date() },
    });
  },

  async markSPKCreated(
    tx: Tx,
    complaintId: string,
    workOrderId: string,
    opts: Omit<UpdateStatusOptions, "link"> & { note?: string | null },
  ) {
    await updateComplaintStatus(tx, complaintId, "SPK_CREATED", {
      ...opts,
      link: { workOrderId, processedAt: new Date() },
    });
  },

  async markRRCreated(
    tx: Tx,
    complaintId: string,
    repairReportId: string,
    opts: Omit<UpdateStatusOptions, "link"> & { note?: string | null },
  ) {
    await updateComplaintStatus(tx, complaintId, "RR_CREATED", {
      ...opts,
      link: { repairReportId },
    });
  },

  async markCompleted(
    tx: Tx,
    complaintId: string,
    opts: Omit<UpdateStatusOptions, "link"> & { note?: string | null },
  ) {
    await updateComplaintStatus(tx, complaintId, "COMPLETED", opts);
  },

  async markMonitoring(
    tx: Tx,
    complaintId: string,
    opts: Omit<UpdateStatusOptions, "link"> & { note?: string | null },
  ) {
    await updateComplaintStatus(tx, complaintId, "MONITORING", opts);
  },
};
