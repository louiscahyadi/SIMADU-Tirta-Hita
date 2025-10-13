-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "mapsLink" TEXT,
    "connectionNumber" TEXT,
    "phone" TEXT,
    "complaintText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "processedAt" DATETIME,
    "serviceRequestId" TEXT,
    "workOrderId" TEXT,
    "repairReportId" TEXT,
    CONSTRAINT "Complaint_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Complaint_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Complaint_repairReportId_fkey" FOREIGN KEY ("repairReportId") REFERENCES "RepairReport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_serviceRequestId_key" ON "Complaint"("serviceRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_workOrderId_key" ON "Complaint"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_repairReportId_key" ON "Complaint"("repairReportId");
