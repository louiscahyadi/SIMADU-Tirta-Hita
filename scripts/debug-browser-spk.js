/**
 * Browser debug script - paste ini di browser console saat form SPK terbuka
 * untuk melakukan debugging manual auto-fill
 */

async function debugSPKAutoFill() {
  console.log("🔍 Debug SPK Auto-Fill - Manual Test");

  // Get serviceRequestId from URL
  const urlParams = new URLSearchParams(window.location.search);
  const serviceRequestId = urlParams.get("serviceRequestId");

  if (!serviceRequestId) {
    console.log("❌ No serviceRequestId found in URL");
    return;
  }

  console.log("📋 Testing with serviceRequestId:", serviceRequestId);

  try {
    // Test API call manually
    console.log("🌐 Making API call...");
    const response = await fetch(
      `/api/service-requests?id=${encodeURIComponent(serviceRequestId)}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      },
    );

    console.log("📡 Response status:", response.status);
    console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log("❌ Error response:", errorText);
      return;
    }

    const data = await response.json();
    console.log("📦 API Response Data:", data);

    // Test auto-fill logic
    const reporter = (
      data?.reporterName ||
      data?.customerName ||
      data?._complaintCustomerName ||
      ""
    )
      .toString()
      .trim();

    const address = (data?.address || data?._complaintAddress || "").toString().trim();
    const jenis = (data?._complaintCategory || "").toString().trim();
    const compId = (data?._complaintId || data?.complaintId || "").toString();

    console.log("🔧 Auto-fill Analysis:");
    console.log("  Nama Pelapor:", reporter || "EMPTY");
    console.log("  Lokasi Gangguan:", address || "EMPTY");
    console.log("  Jenis Gangguan:", jenis || "EMPTY");
    console.log("  Case ID:", compId || "EMPTY");

    if (reporter && address && jenis) {
      console.log("✅ Auto-fill should work!");

      // Try to fill the form manually
      const reporterInput = document.querySelector('input[name="reporterName"]');
      const addressInput = document.querySelector('input[name="disturbanceLocation"]');
      const jenisInput = document.querySelector('input[name="disturbanceType"]');

      if (reporterInput) {
        reporterInput.value = reporter;
        reporterInput.dispatchEvent(new Event("input", { bubbles: true }));
        console.log("✅ Filled reporter name");
      }

      if (addressInput) {
        addressInput.value = address;
        addressInput.dispatchEvent(new Event("input", { bubbles: true }));
        console.log("✅ Filled address");
      }

      if (jenisInput) {
        jenisInput.value = jenis;
        jenisInput.dispatchEvent(new Event("input", { bubbles: true }));
        console.log("✅ Filled jenis gangguan");
      }
    } else {
      console.log("❌ Auto-fill failed - missing data");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Auto run if serviceRequestId exists
if (new URLSearchParams(window.location.search).get("serviceRequestId")) {
  console.log("🚀 Auto-running SPK debug...");
  debugSPKAutoFill();
}

console.log("💡 Paste debugSPKAutoFill() in console to run manual test");
