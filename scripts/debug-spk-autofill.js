const { PrismaClient } = require("@prisma/client");

async function debugSPKAutoFill() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Debugging SPK Auto-fill Issue\n");

    // 1. Check ServiceRequests that should have SPK created (status PSP_CREATED)
    const serviceRequestsReady = await prisma.serviceRequest.findMany({
      where: {
        complaint: {
          status: "PSP_CREATED",
        },
        workOrder: null, // belum ada SPK
      },
      include: {
        complaint: true,
        workOrder: true,
      },
      take: 5,
    });

    console.log(
      `📊 Found ${serviceRequestsReady.length} ServiceRequests ready for SPK creation:\n`,
    );

    serviceRequestsReady.forEach((sr, index) => {
      console.log(`${index + 1}. ServiceRequest ID: ${sr.id}`);
      console.log(`   Reporter Name: ${sr.reporterName || "NULL"}`);
      console.log(`   Customer Name: ${sr.customerName || "NULL"}`);
      console.log(`   Address: ${sr.address || "NULL"}`);
      console.log(`   Connected Complaint: ${sr.complaint ? "YES" : "NO"}`);

      if (sr.complaint) {
        console.log(`   Complaint ID: ${sr.complaint.id}`);
        console.log(`   Complaint Customer: ${sr.complaint.customerName || "NULL"}`);
        console.log(`   Complaint Address: ${sr.complaint.address || "NULL"}`);
        console.log(`   Complaint Category: ${sr.complaint.category || "NULL"}`);
        console.log(`   Complaint Status: ${sr.complaint.status}`);
      }
      console.log("");
    });

    // 2. Test API endpoint simulation
    if (serviceRequestsReady.length > 0) {
      const testId = serviceRequestsReady[0].id;
      console.log(`🧪 Testing API endpoint logic for ServiceRequest: ${testId}\n`);

      const sr = await prisma.serviceRequest.findUnique({
        where: { id: testId },
      });

      const comp = await prisma.complaint.findFirst({
        where: { serviceRequestId: testId },
        select: { id: true, category: true, customerName: true, address: true },
      });

      const apiResponse = {
        ...sr,
        _complaintCategory: comp?.category ?? null,
        _complaintId: comp?.id ?? null,
        _complaintCustomerName: comp?.customerName ?? null,
        _complaintAddress: comp?.address ?? null,
      };

      console.log("📡 Simulated API Response:");
      console.log(`   reporterName: ${apiResponse.reporterName || "NULL"}`);
      console.log(`   customerName: ${apiResponse.customerName || "NULL"}`);
      console.log(`   address: ${apiResponse.address || "NULL"}`);
      console.log(`   _complaintCategory: ${apiResponse._complaintCategory || "NULL"}`);
      console.log(`   _complaintCustomerName: ${apiResponse._complaintCustomerName || "NULL"}`);
      console.log(`   _complaintAddress: ${apiResponse._complaintAddress || "NULL"}`);
      console.log(`   _complaintId: ${apiResponse._complaintId || "NULL"}`);
      console.log("");

      // 3. Check what would be auto-filled
      const reporter = (
        apiResponse?.reporterName ||
        apiResponse?.customerName ||
        apiResponse?._complaintCustomerName ||
        ""
      )
        .toString()
        .trim();

      const address = (apiResponse?.address || apiResponse?._complaintAddress || "")
        .toString()
        .trim();
      const jenis = (apiResponse?._complaintCategory || "").toString().trim();

      console.log("🔧 Auto-fill Analysis:");
      console.log(`   Nama Pelapor would be: "${reporter}"`);
      console.log(`   Lokasi Gangguan would be: "${address}"`);
      console.log(`   Jenis Gangguan would be: "${jenis}"`);

      if (!reporter && !address && !jenis) {
        console.log("❌ ISSUE FOUND: No fields would be auto-filled!");

        console.log("\n🔍 Investigating the issue:");

        // Check if ServiceRequest has data
        console.log("ServiceRequest data:");
        console.log(`   reporterName: ${sr.reporterName || "EMPTY"}`);
        console.log(`   customerName: ${sr.customerName || "EMPTY"}`);
        console.log(`   address: ${sr.address || "EMPTY"}`);

        // Check if Complaint exists and has data
        if (comp) {
          console.log("Complaint data:");
          console.log(`   customerName: ${comp.customerName || "EMPTY"}`);
          console.log(`   address: ${comp.address || "EMPTY"}`);
          console.log(`   category: ${comp.category || "EMPTY"}`);
        } else {
          console.log("❌ Complaint not found for this ServiceRequest!");
        }
      } else {
        console.log("✅ Auto-fill would work correctly!");
      }
    }

    // 4. Check if there are orphaned ServiceRequests
    console.log("\n🔍 Checking for orphaned ServiceRequests (without Complaint)...");
    const orphanedSR = await prisma.serviceRequest.findMany({
      where: {
        complaint: null,
      },
      take: 5,
    });

    console.log(`Found ${orphanedSR.length} ServiceRequests without linked Complaints`);
    orphanedSR.forEach((sr, index) => {
      console.log(
        `${index + 1}. ID: ${sr.id} | Reporter: ${sr.reporterName || "NULL"} | Customer: ${sr.customerName || "NULL"}`,
      );
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSPKAutoFill();
