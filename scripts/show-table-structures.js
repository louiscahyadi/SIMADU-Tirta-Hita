const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function showTableStructures() {
  try {
    console.log("🏗️  STRUKTUR DETAIL TABEL DATABASE SIMADU\n");
    console.log("========================================\n");

    // Raw query untuk mendapatkan struktur tabel dari MySQL
    const tables = ["Complaint", "ServiceRequest", "WorkOrder", "RepairReport", "StatusHistory"];

    for (const tableName of tables) {
      console.log(`\n📋 TABEL: ${tableName.toUpperCase()}`);
      console.log("─".repeat(50));

      try {
        const columns = await prisma.$queryRaw`
          SELECT 
            COLUMN_NAME as columnName,
            DATA_TYPE as dataType,
            IS_NULLABLE as isNullable,
            COLUMN_DEFAULT as defaultValue,
            CHARACTER_MAXIMUM_LENGTH as maxLength,
            COLUMN_KEY as columnKey,
            EXTRA as extra
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = 'simadu' 
          AND TABLE_NAME = ${tableName}
          ORDER BY ORDINAL_POSITION
        `;

        columns.forEach((col, index) => {
          const nullable = col.isNullable === "YES" ? "(nullable)" : "(required)";
          const key = col.columnKey ? `[${col.columnKey}]` : "";
          const extra = col.extra ? `{${col.extra}}` : "";
          const maxLen = col.maxLength ? `(${col.maxLength})` : "";

          console.log(
            `${index + 1}. ${col.columnName} - ${col.dataType}${maxLen} ${nullable} ${key} ${extra}`.trim(),
          );
        });

        // Tampilkan jumlah data
        let count = 0;
        switch (tableName) {
          case "Complaint":
            count = await prisma.complaint.count();
            break;
          case "ServiceRequest":
            count = await prisma.serviceRequest.count();
            break;
          case "WorkOrder":
            count = await prisma.workOrder.count();
            break;
          case "RepairReport":
            count = await prisma.repairReport.count();
            break;
          case "StatusHistory":
            count = await prisma.statusHistory.count();
            break;
        }

        console.log(`\n   💾 Total records: ${count}`);
      } catch (error) {
        console.log(`   ❌ Error getting structure: ${error.message}`);
      }
    }

    console.log("\n\n🔗 RELASI ANTAR TABEL:");
    console.log("─".repeat(50));
    console.log("Complaint → ServiceRequest (1:1)");
    console.log("Complaint → WorkOrder (1:1)");
    console.log("Complaint → RepairReport (1:1)");
    console.log("Complaint → StatusHistory (1:many)");
    console.log("ServiceRequest → WorkOrder (1:1)");
    console.log("WorkOrder → RepairReport (1:1)");

    console.log("\n\n📊 ENUM VALUES:");
    console.log("─".repeat(50));
    console.log(
      "CaseStatus: REPORTED, PSP_CREATED, SPK_CREATED, RR_CREATED, COMPLETED, MONITORING",
    );
    console.log("RepairResult: FIXED, MONITORING, NOT_FIXED");
    console.log("Urgency: LOW, MEDIUM, HIGH");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showTableStructures();
