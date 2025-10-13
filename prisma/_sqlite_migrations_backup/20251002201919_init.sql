-- Backup of original SQLite migration
-- File: prisma/migrations/20251002201919_init/migration.sql
-- Provider: sqlite
-- Date: backup created for MySQL transition
--
-- Original content below:
-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "serviceNumber" TEXT,
    "phone" TEXT,
    "receivedAt" DATETIME,
    "receivedBy" TEXT,
    "handledAt" DATETIME,
    "handlerName" TEXT,
    "inspectedAt" DATETIME,
    "inspectorName" TEXT,
    "reasons" TEXT,
    "otherReason" TEXT,
    "actionTaken" TEXT,
    "serviceCostBy" TEXT,
    "handoverReceiver" TEXT,
    "handoverCustomer" TEXT,
    "handoverAt" DATETIME
);

-- CreateTable
CREATE TABLE "WorkOrder" (
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
    "team" TEXT
);

-- CreateTable
CREATE TABLE "RepairReport" (
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
    "authorizedBy" TEXT
);
