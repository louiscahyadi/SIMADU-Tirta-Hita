const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("=== Checking SPK Status Debug ===");

    // Check complaints
    const complaints = await prisma.complaint.findMany({
      include: {
        serviceRequest: true,
        workOrder: true,
        repairReport: true,
      },
    });

    console.log("\n--- Complaints ---");
    complaints.forEach((comp) => {
      console.log(`ID: ${comp.id}`);
      console.log(`Status: ${comp.status}`);
      console.log(`Service Request ID: ${comp.serviceRequestId}`);
      console.log(`Work Order ID: ${comp.workOrderId}`);
      console.log(`Repair Report ID: ${comp.repairReportId}`);
      console.log(`Has Service Request: ${comp.serviceRequest ? "YES" : "NO"}`);
      console.log(`Has Work Order: ${comp.workOrder ? "YES" : "NO"}`);
      console.log("---");
    });

    // Check service requests
    const serviceRequests = await prisma.serviceRequest.findMany({
      include: {
        complaint: true,
        workOrder: true,
      },
    });

    console.log("\n--- Service Requests ---");
    serviceRequests.forEach((sr) => {
      console.log(`ID: ${sr.id}`);
      console.log(`Reporter Name: ${sr.reporterName}`);
      console.log(`Complaint ID: ${sr.complaintId}`);
      console.log(`Has Work Order: ${sr.workOrder ? "YES" : "NO"}`);
      console.log("---");
    });

    // Check work orders
    const workOrders = await prisma.workOrder.findMany({
      include: {
        serviceRequest: true,
        complaint: true,
      },
    });

    console.log("\n--- Work Orders ---");
    console.log(`Total Work Orders: ${workOrders.length}`);
    workOrders.forEach((wo) => {
      console.log(`ID: ${wo.id}`);
      console.log(`Team: ${wo.team}`);
      console.log(`Service Request ID: ${wo.serviceRequestId}`);
      console.log("---");
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
