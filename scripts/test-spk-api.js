const fetch = require("node-fetch");

async function testSPKCreation() {
  console.log("=== Testing SPK Creation ===");

  // Test data berdasarkan screenshot
  const payload = {
    caseId: "cmhe79vk50000fpfkv2f27uhr", // dari database
    pspId: "cmhe7l4pj0000fpdk1uxmflut", // dari database
    teamName: "Unit Meteran",
    technicians: "Budi, Wayan, Sari",
    scheduledDate: "2025-10-31",
    reportDate: "2025-10-31",
    reporterName: "John Doe",
    disturbanceLocation: "Jl. Mawar No. 1",
    handledDate: "2025-10-31",
    handlingTime: "11:00 - 12:00 WITA",
    disturbanceType: "WM Mati",
    workOrderNumber: "01",
  };

  try {
    const response = await fetch("http://localhost:3000/api/work-orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Need auth - let's check without first
      },
      body: JSON.stringify(payload),
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log("Response body:", responseText);

    if (!response.ok) {
      console.log("Request failed with status:", response.status);
      try {
        const errorData = JSON.parse(responseText);
        console.log("Error details:", JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.log("Could not parse error response as JSON");
      }
    } else {
      console.log("SPK created successfully!");
      const result = JSON.parse(responseText);
      console.log("Created SPK:", JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error("Network error:", error.message);
  }
}

testSPKCreation();
