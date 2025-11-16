const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function showTables() {
  try {
    console.log("🔍 Menampilkan informasi tabel database...\n");

    // Menampilkan jumlah data di setiap tabel
    const complaints = await prisma.complaint.count();
    const serviceRequests = await prisma.serviceRequest.count();
    const workOrders = await prisma.workOrder.count();
    const repairReports = await prisma.repairReport.count();
    const statusHistories = await prisma.statusHistory.count();

    console.log("📊 Jumlah Data per Tabel:");
    console.log(`├── Complaint (Pengaduan): ${complaints} record(s)`);
    console.log(`├── ServiceRequest (PSP): ${serviceRequests} record(s)`);
    console.log(`├── WorkOrder (SPK): ${workOrders} record(s)`);
    console.log(`├── RepairReport (RR): ${repairReports} record(s)`);
    console.log(`└── StatusHistory: ${statusHistories} record(s)`);

    console.log("\n📋 Struktur Tabel:");

    // Menampilkan beberapa data terbaru dari setiap tabel
    console.log("\n🔴 Complaint (Pengaduan) - 5 data terbaru:");
    const recentComplaints = await prisma.complaint.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerName: true,
        category: true,
        status: true,
        createdAt: true,
      },
    });

    if (recentComplaints.length > 0) {
      recentComplaints.forEach((complaint, index) => {
        console.log(
          `${index + 1}. ${complaint.customerName} - ${complaint.category} - ${complaint.status} (${complaint.createdAt.toLocaleDateString()})`,
        );
      });
    } else {
      console.log("   Tidak ada data pengaduan");
    }

    console.log("\n🟡 ServiceRequest (PSP) - 5 data terbaru:");
    const recentServiceRequests = await prisma.serviceRequest.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerName: true,
        serviceNumber: true,
        urgency: true,
        createdAt: true,
      },
    });

    if (recentServiceRequests.length > 0) {
      recentServiceRequests.forEach((sr, index) => {
        console.log(
          `${index + 1}. ${sr.customerName} - ${sr.serviceNumber || "N/A"} - ${sr.urgency} (${sr.createdAt.toLocaleDateString()})`,
        );
      });
    } else {
      console.log("   Tidak ada data service request");
    }

    console.log("\n🔵 WorkOrder (SPK) - 5 data terbaru:");
    const recentWorkOrders = await prisma.workOrder.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        number: true,
        disturbanceLocation: true,
        team: true,
        createdAt: true,
      },
    });

    if (recentWorkOrders.length > 0) {
      recentWorkOrders.forEach((wo, index) => {
        console.log(
          `${index + 1}. ${wo.number || "N/A"} - ${wo.disturbanceLocation || "N/A"} - ${wo.team || "N/A"} (${wo.createdAt.toLocaleDateString()})`,
        );
      });
    } else {
      console.log("   Tidak ada data work order");
    }

    console.log("\n🟢 RepairReport (RR) - 5 data terbaru:");
    const recentRepairReports = await prisma.repairReport.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        result: true,
        executorName: true,
        team: true,
        createdAt: true,
      },
    });

    if (recentRepairReports.length > 0) {
      recentRepairReports.forEach((rr, index) => {
        console.log(
          `${index + 1}. ${rr.result || "N/A"} - ${rr.executorName || "N/A"} - ${rr.team || "N/A"} (${rr.createdAt.toLocaleDateString()})`,
        );
      });
    } else {
      console.log("   Tidak ada data repair report");
    }

    console.log("\n⚪ StatusHistory - 5 data terbaru:");
    const recentStatusHistory = await prisma.statusHistory.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        actorRole: true,
        createdAt: true,
        complaint: {
          select: {
            customerName: true,
          },
        },
      },
    });

    if (recentStatusHistory.length > 0) {
      recentStatusHistory.forEach((sh, index) => {
        console.log(
          `${index + 1}. ${sh.complaint.customerName} - ${sh.status} - ${sh.actorRole} (${sh.createdAt.toLocaleDateString()})`,
        );
      });
    } else {
      console.log("   Tidak ada data status history");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showTables();
