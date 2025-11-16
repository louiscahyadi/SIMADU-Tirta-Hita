/**
 * Script to test the service-requests API endpoint directly
 */
const { PrismaClient } = require("@prisma/client");

async function testServiceRequestAPI() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Testing Service Request API Logic\n");

    // Get a sample ServiceRequest that should work
    const sampleSR = await prisma.serviceRequest.findFirst({
      where: {
        complaint: {
          status: "PSP_CREATED",
        },
        workOrder: null,
      },
      include: {
        complaint: true,
      },
    });

    if (!sampleSR) {
      console.log("❌ No suitable ServiceRequest found for testing");
      return;
    }

    console.log(`📋 Testing with ServiceRequest ID: ${sampleSR.id}`);
    console.log(`📋 Reporter: ${sampleSR.reporterName || "NULL"}`);
    console.log(`📋 Address: ${sampleSR.address || "NULL"}`);
    if (sampleSR.complaint) {
      console.log(`📋 Linked Complaint Category: ${sampleSR.complaint.category || "NULL"}`);
    }
    console.log("");

    // Simulate the exact API logic
    console.log("🔧 Simulating API GET /api/service-requests?id=...\n");

    // Step 1: Find the ServiceRequest
    const sr = await prisma.serviceRequest.findUnique({
      where: { id: sampleSR.id },
    });

    if (!sr) {
      console.log("❌ ServiceRequest not found");
      return;
    }

    console.log("✅ Step 1: ServiceRequest found");

    // Step 2: Find related complaint
    const comp = await prisma.complaint.findFirst({
      where: { serviceRequestId: sampleSR.id },
      select: { id: true, category: true, customerName: true, address: true },
    });

    console.log(`✅ Step 2: Complaint ${comp ? "found" : "NOT found"}`);
    if (comp) {
      console.log(`   - ID: ${comp.id}`);
      console.log(`   - Category: ${comp.category || "NULL"}`);
      console.log(`   - Customer: ${comp.customerName || "NULL"}`);
      console.log(`   - Address: ${comp.address || "NULL"}`);
    }

    // Step 3: Build API response
    const apiResponse = {
      ...sr,
      _complaintCategory: comp?.category ?? null,
      _complaintId: comp?.id ?? null,
      _complaintCustomerName: comp?.customerName ?? null,
      _complaintAddress: comp?.address ?? null,
    };

    console.log("\n📡 API Response would be:");
    console.log(
      JSON.stringify(
        {
          id: apiResponse.id,
          reporterName: apiResponse.reporterName,
          customerName: apiResponse.customerName,
          address: apiResponse.address,
          _complaintCategory: apiResponse._complaintCategory,
          _complaintId: apiResponse._complaintId,
          _complaintCustomerName: apiResponse._complaintCustomerName,
          _complaintAddress: apiResponse._complaintAddress,
        },
        null,
        2,
      ),
    );

    // Step 4: Test WorkOrderForm auto-fill logic
    console.log("\n🔧 Testing WorkOrderForm auto-fill logic:");

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
    const compId = (apiResponse?._complaintId || apiResponse?.complaintId || "").toString();

    console.log(`✅ Nama Pelapor: "${reporter}"`);
    console.log(`✅ Lokasi Gangguan: "${address}"`);
    console.log(`✅ Jenis Gangguan: "${jenis}"`);
    console.log(`✅ Case ID: "${compId}"`);

    if (reporter && address && jenis) {
      console.log("\n🎉 SUCCESS: All fields would be auto-filled correctly!");
    } else {
      console.log("\n❌ ISSUE: Some fields are empty:");
      if (!reporter) console.log("   - Nama Pelapor is empty");
      if (!address) console.log("   - Lokasi Gangguan is empty");
      if (!jenis) console.log("   - Jenis Gangguan is empty");
    }

    // Test all available PSP records
    console.log("\n🔍 Testing all available PSP records:");

    const allPSPs = await prisma.serviceRequest.findMany({
      where: {
        complaint: {
          status: "PSP_CREATED",
        },
        workOrder: null,
      },
      include: {
        complaint: {
          select: { id: true, category: true, customerName: true, address: true },
        },
      },
    });

    console.log(`Found ${allPSPs.length} PSP records to test:\n`);

    let successCount = 0;
    let issueCount = 0;

    for (let i = 0; i < allPSPs.length; i++) {
      const psp = allPSPs[i];
      const reporter = (
        psp.reporterName ||
        psp.customerName ||
        psp.complaint?.customerName ||
        ""
      ).trim();
      const address = (psp.address || psp.complaint?.address || "").trim();
      const jenis = (psp.complaint?.category || "").trim();

      console.log(`${i + 1}. PSP ID: ${psp.id}`);
      console.log(`   Reporter: "${reporter}"`);
      console.log(`   Address: "${address}"`);
      console.log(`   Category: "${jenis}"`);

      if (reporter && address && jenis) {
        console.log(`   ✅ OK - All fields available`);
        successCount++;
      } else {
        console.log(`   ❌ ISSUE - Missing fields`);
        issueCount++;
      }
      console.log("");
    }

    console.log(`📊 Summary: ${successCount} OK, ${issueCount} with issues`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testServiceRequestAPI();
