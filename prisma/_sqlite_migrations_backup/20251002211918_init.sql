-- Backup of original SQLite migration
-- File: prisma/migrations/20251002211918_init/migration.sql
-- Provider: sqlite
-- Date: backup created for MySQL transition
--
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
CREATE UNIQUE INDEX "WorkOrder_serviceRequestId_key" ON "WorkOrder"("serviceRequestId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
