-- CreateTable
CREATE TABLE `ServiceRequest` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `serviceNumber` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `receivedAt` DATETIME(3) NULL,
    `receivedBy` VARCHAR(191) NULL,
    `handledAt` DATETIME(3) NULL,
    `handlerName` VARCHAR(191) NULL,
    `inspectedAt` DATETIME(3) NULL,
    `inspectorName` VARCHAR(191) NULL,
    `reasons` VARCHAR(191) NULL,
    `otherReason` VARCHAR(191) NULL,
    `actionTaken` VARCHAR(191) NULL,
    `serviceCostBy` VARCHAR(191) NULL,
    `handoverReceiver` VARCHAR(191) NULL,
    `handoverCustomer` VARCHAR(191) NULL,
    `handoverAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkOrder` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `reportDate` DATETIME(3) NULL,
    `number` VARCHAR(191) NULL,
    `handledDate` DATETIME(3) NULL,
    `reporterName` VARCHAR(191) NULL,
    `handlingTime` VARCHAR(191) NULL,
    `disturbanceLocation` VARCHAR(191) NULL,
    `disturbanceType` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `cityDate` DATETIME(3) NULL,
    `executorName` VARCHAR(191) NULL,
    `team` VARCHAR(191) NULL,
    `serviceRequestId` VARCHAR(191) NULL,

    UNIQUE INDEX `WorkOrder_serviceRequestId_key`(`serviceRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RepairReport` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `actions` VARCHAR(191) NULL,
    `otherActions` VARCHAR(191) NULL,
    `notHandledReasons` VARCHAR(191) NULL,
    `otherNotHandled` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `cityDate` DATETIME(3) NULL,
    `executorName` VARCHAR(191) NULL,
    `team` VARCHAR(191) NULL,
    `authorizedBy` VARCHAR(191) NULL,
    `workOrderId` VARCHAR(191) NULL,

    UNIQUE INDEX `RepairReport_workOrderId_key`(`workOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Complaint` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `mapsLink` VARCHAR(191) NULL,
    `connectionNumber` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `complaintText` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `processedAt` DATETIME(3) NULL,
    `serviceRequestId` VARCHAR(191) NULL,
    `workOrderId` VARCHAR(191) NULL,
    `repairReportId` VARCHAR(191) NULL,

    UNIQUE INDEX `Complaint_serviceRequestId_key`(`serviceRequestId`),
    UNIQUE INDEX `Complaint_workOrderId_key`(`workOrderId`),
    UNIQUE INDEX `Complaint_repairReportId_key`(`repairReportId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_serviceRequestId_fkey` FOREIGN KEY (`serviceRequestId`) REFERENCES `ServiceRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RepairReport` ADD CONSTRAINT `RepairReport_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `WorkOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_serviceRequestId_fkey` FOREIGN KEY (`serviceRequestId`) REFERENCES `ServiceRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `WorkOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Complaint` ADD CONSTRAINT `Complaint_repairReportId_fkey` FOREIGN KEY (`repairReportId`) REFERENCES `RepairReport`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
