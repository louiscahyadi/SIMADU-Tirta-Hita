/*
  Warnings:

  - You are about to alter the column `actions` on the `RepairReport` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.
  - You are about to alter the column `notHandledReasons` on the `RepairReport` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.
  - You are about to alter the column `reasons` on the `ServiceRequest` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.

*/
-- AlterTable
ALTER TABLE `Complaint` MODIFY `address` TEXT NOT NULL,
    MODIFY `mapsLink` VARCHAR(512) NULL,
    MODIFY `complaintText` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `RepairReport` MODIFY `actions` JSON NULL,
    MODIFY `notHandledReasons` JSON NULL;

-- AlterTable
ALTER TABLE `ServiceRequest` MODIFY `reasons` JSON NULL;

-- CreateIndex
CREATE INDEX `Complaint_createdAt_idx` ON `Complaint`(`createdAt`);

-- CreateIndex
CREATE INDEX `RepairReport_createdAt_idx` ON `RepairReport`(`createdAt`);

-- CreateIndex
CREATE INDEX `ServiceRequest_createdAt_idx` ON `ServiceRequest`(`createdAt`);

-- CreateIndex
CREATE INDEX `WorkOrder_createdAt_idx` ON `WorkOrder`(`createdAt`);
