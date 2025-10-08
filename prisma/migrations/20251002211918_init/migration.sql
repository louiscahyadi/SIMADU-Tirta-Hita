-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RepairReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "actions" TEXT,
    "otherActions" TEXT,
    "notHandledReasons" TEXT,
    "otherNotHandled" TEXT,
    "city" TEXT,
    "cityDate" DATETIME,
    "executorName" TEXT,
    "team" TEXT,
    "authorizedBy" TEXT,
    "workOrderId" TEXT,
    CONSTRAINT "RepairReport_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RepairReport" ("actions", "authorizedBy", "city", "cityDate", "createdAt", "executorName", "id", "notHandledReasons", "otherActions", "otherNotHandled", "team", "updatedAt") SELECT "actions", "authorizedBy", "city", "cityDate", "createdAt", "executorName", "id", "notHandledReasons", "otherActions", "otherNotHandled", "team", "updatedAt" FROM "RepairReport";
DROP TABLE "RepairReport";
ALTER TABLE "new_RepairReport" RENAME TO "RepairReport";
CREATE UNIQUE INDEX "RepairReport_workOrderId_key" ON "RepairReport"("workOrderId");
CREATE TABLE "new_WorkOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "reportDate" DATETIME,
    "number" TEXT,
    "handledDate" DATETIME,
    "reporterName" TEXT,
    "handlingTime" TEXT,
    "disturbanceLocation" TEXT,
    "disturbanceType" TEXT,
    "city" TEXT,
    "cityDate" DATETIME,
    "executorName" TEXT,
    "team" TEXT,
    "serviceRequestId" TEXT,
    CONSTRAINT "WorkOrder_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkOrder" ("city", "cityDate", "createdAt", "disturbanceLocation", "disturbanceType", "executorName", "handledDate", "handlingTime", "id", "number", "reportDate", "reporterName", "team", "updatedAt") SELECT "city", "cityDate", "createdAt", "disturbanceLocation", "disturbanceType", "executorName", "handledDate", "handlingTime", "id", "number", "reportDate", "reporterName", "team", "updatedAt" FROM "WorkOrder";
DROP TABLE "WorkOrder";
ALTER TABLE "new_WorkOrder" RENAME TO "WorkOrder";
CREATE UNIQUE INDEX "WorkOrder_serviceRequestId_key" ON "WorkOrder"("serviceRequestId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
