const { PrismaClient } = require("@prisma/client");

(async () => {
  const prisma = new PrismaClient();
  try {
    const ping = await prisma.$queryRawUnsafe("SELECT 1 AS ok");
    const counts = await Promise.all([
      prisma.complaint.count(),
      prisma.serviceRequest.count(),
      prisma.workOrder.count(),
      prisma.repairReport.count(),
    ]);
    console.log("DB ok:", ping);
    console.log("Counts [complaint, serviceRequest, workOrder, repairReport]:", counts);
  } catch (e) {
    console.error("Prisma connection/test failed:", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
