import { CaseStatus } from "@prisma/client";

import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export interface CaseChain {
  complaintId: string;
  serviceRequestId: string | null;
  workOrderId: string | null;
  repairReportId: string | null;
}

/**
 * Fetches the canonical chain for a case by walking SR→WO→RR and reading Complaint links.
 * Use inside a transaction when validating writes.
 */
export async function getCaseChain(tx: Tx, complaintId: string): Promise<CaseChain> {
  const comp = await tx.complaint.findUnique({ where: { id: complaintId } });
  if (!comp) throw new Error("Kasus tidak ditemukan");

  // Walk the normalized chain if present
  let srId: string | null = comp.serviceRequestId;
  let woId: string | null = comp.workOrderId;
  let rrId: string | null = comp.repairReportId;

  if (srId) {
    const wo = await tx.workOrder.findFirst({
      where: { serviceRequestId: srId },
      select: { id: true },
    });
    if (wo) woId = wo.id;
  }
  if (woId) {
    const rr = await tx.repairReport.findFirst({
      where: { workOrderId: woId },
      select: { id: true },
    });
    if (rr) rrId = rr.id;
  }

  return { complaintId, serviceRequestId: srId, workOrderId: woId, repairReportId: rrId };
}

/** Ensures a case can create PSP: status must be REPORTED and no existing SR. */
export async function assertCanCreateSR(tx: Tx, complaintId: string) {
  const comp = await tx.complaint.findUnique({
    where: { id: complaintId },
    select: { id: true, status: true, serviceRequestId: true },
  });
  if (!comp) {
    throw new Error("Kasus tidak ditemukan. Pastikan nomor referensi pengaduan benar.");
  }
  if (comp.status !== CaseStatus.REPORTED) {
    throw new Error(
      `PSP hanya bisa dibuat ketika status kasus = REPORTED. Status saat ini: ${comp.status}`,
    );
  }
  if (comp.serviceRequestId) {
    throw new Error("PSP sudah ada untuk kasus ini. Tidak bisa membuat PSP duplikat.");
  }
}

/** Ensures a case can create SPK: status PSP_CREATED, SR must match, no existing WO. */
export async function assertCanCreateWO(tx: Tx, complaintId: string, pspId: string) {
  const comp = await tx.complaint.findUnique({
    where: { id: complaintId },
    select: { id: true, status: true, serviceRequestId: true, workOrderId: true },
  });
  if (!comp) {
    throw new Error("Kasus tidak ditemukan. Pastikan nomor referensi pengaduan benar.");
  }
  if (comp.serviceRequestId !== pspId) {
    throw new Error("PSP yang dipilih tidak sesuai dengan kasus ini.");
  }
  if (comp.status !== CaseStatus.PSP_CREATED) {
    throw new Error(
      `SPK hanya bisa dibuat ketika status kasus = PSP_CREATED. Status saat ini: ${comp.status}`,
    );
  }
  if (comp.workOrderId) {
    throw new Error("SPK sudah ada untuk kasus ini. Tidak bisa membuat SPK duplikat.");
  }
  const sr = await tx.serviceRequest.findUnique({ where: { id: pspId } });
  if (!sr) {
    throw new Error("PSP tidak ditemukan. Pastikan data PSP sudah dibuat sebelumnya.");
  }
}

/** Ensures a case can create BAP: status SPK_CREATED, WO must match, no existing RR. */
export async function assertCanCreateRR(tx: Tx, complaintId: string, spkId: string) {
  const comp = await tx.complaint.findUnique({
    where: { id: complaintId },
    select: { id: true, status: true, workOrderId: true, repairReportId: true },
  });
  if (!comp) {
    throw new Error("Kasus tidak ditemukan. Pastikan nomor referensi pengaduan benar.");
  }
  if (comp.workOrderId !== spkId) {
    throw new Error("SPK yang dipilih tidak sesuai dengan kasus ini.");
  }
  if (comp.status !== CaseStatus.SPK_CREATED) {
    throw new Error(
      `BAP hanya bisa dibuat ketika status kasus = SPK_CREATED. Status saat ini: ${comp.status}`,
    );
  }
  if (comp.repairReportId) {
    throw new Error("BAP sudah ada untuk kasus ini. Tidak bisa membuat BAP duplikat.");
  }
  const wo = await tx.workOrder.findUnique({ where: { id: spkId } });
  if (!wo) {
    throw new Error("SPK tidak ditemukan. Pastikan data SPK sudah dibuat sebelumnya.");
  }
}

/**
 * Verifies and optionally fixes the consistency between Complaint linkages and the SR→WO→RR chain.
 * Returns a summary including whether any mismatch was found and, if fix=true, the updated complaint.
 */
export async function verifyCaseConsistency(
  tx: Tx,
  complaintId: string,
  opts: { fix?: boolean } = {},
) {
  const comp = await tx.complaint.findUnique({
    where: { id: complaintId },
    select: {
      id: true,
      serviceRequestId: true,
      workOrderId: true,
      repairReportId: true,
    },
  });
  if (!comp) {
    throw new Error("Kasus tidak ditemukan untuk verifikasi konsistensi.");
  }
  const chain = await getCaseChain(tx, complaintId);

  const mismatch =
    (comp.serviceRequestId ?? null) !== (chain.serviceRequestId ?? null) ||
    (comp.workOrderId ?? null) !== (chain.workOrderId ?? null) ||
    (comp.repairReportId ?? null) !== (chain.repairReportId ?? null);

  if (mismatch && opts.fix) {
    const updated = await tx.complaint.update({
      where: { id: complaintId },
      data: {
        serviceRequestId: chain.serviceRequestId,
        workOrderId: chain.workOrderId,
        repairReportId: chain.repairReportId,
      },
    });
    return { mismatch: true, fixed: true, complaint: updated, chain };
  }

  return { mismatch, fixed: false, complaint: comp, chain };
}
