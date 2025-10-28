#!/usr/bin/env node
/*
  Verifies consistency between Complaint link fields (serviceRequestId, workOrderId, repairReportId)
  and the normalized SR→WO→RR chain. Run with:
    node scripts/verify-case-links.js [--fix]
*/
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  const fix = process.argv.includes("--fix");
  let mismatches = 0;
  try {
    const complaints = await prisma.complaint.findMany({
      select: { id: true, serviceRequestId: true, workOrderId: true, repairReportId: true },
    });
    for (const c of complaints) {
      let srId = c.serviceRequestId;
      let woId = c.workOrderId;
      let rrId = c.repairReportId;

      if (srId) {
        const wo = await prisma.workOrder.findFirst({
          where: { serviceRequestId: srId },
          select: { id: true },
        });
        if (wo) woId = wo.id;
        else woId = null;
      } else {
        woId = null;
      }

      if (woId) {
        const rr = await prisma.repairReport.findFirst({
          where: { workOrderId: woId },
          select: { id: true },
        });
        if (rr) rrId = rr.id;
        else rrId = null;
      } else {
        rrId = null;
      }

      const mismatch =
        (c.serviceRequestId ?? null) !== (srId ?? null) ||
        (c.workOrderId ?? null) !== (woId ?? null) ||
        (c.repairReportId ?? null) !== (rrId ?? null);
      if (mismatch) {
        mismatches++;
        if (fix) {
          await prisma.complaint.update({
            where: { id: c.id },
            data: { serviceRequestId: srId, workOrderId: woId, repairReportId: rrId },
          });
          console.log(`[fixed] ${c.id} -> sr=${srId} wo=${woId} rr=${rrId}`);
        } else {
          console.log(
            `[mismatch] ${c.id}: current(sr=${c.serviceRequestId}, wo=${c.workOrderId}, rr=${c.repairReportId}) vs chain(sr=${srId}, wo=${woId}, rr=${rrId})`,
          );
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }
  if (mismatches === 0) {
    console.log("All complaints consistent.");
  } else if (!fix) {
    console.log(`Found ${mismatches} mismatches. Re-run with --fix to repair.`);
  } else {
    console.log(`Fixed ${mismatches} complaints.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
