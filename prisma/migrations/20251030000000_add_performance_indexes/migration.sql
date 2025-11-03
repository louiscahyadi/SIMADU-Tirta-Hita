/**
 * Create database migration for performance indexes
 * Run: npx prisma migrate dev --name add_performance_indexes
 */

-- This migration adds indexes to improve query performance

-- ServiceRequest indexes
CREATE INDEX `ServiceRequest_customerName_idx` ON `ServiceRequest`(`customerName`);
CREATE INDEX `ServiceRequest_serviceNumber_idx` ON `ServiceRequest`(`serviceNumber`);
CREATE INDEX `ServiceRequest_reporterName_idx` ON `ServiceRequest`(`reporterName`);
CREATE INDEX `ServiceRequest_requestDate_idx` ON `ServiceRequest`(`requestDate`);
CREATE INDEX `ServiceRequest_urgency_idx` ON `ServiceRequest`(`urgency`);

-- WorkOrder indexes
CREATE INDEX `WorkOrder_number_idx` ON `WorkOrder`(`number`);
CREATE INDEX `WorkOrder_disturbanceLocation_idx` ON `WorkOrder`(`disturbanceLocation`);
CREATE INDEX `WorkOrder_team_idx` ON `WorkOrder`(`team`);
CREATE INDEX `WorkOrder_scheduledDate_idx` ON `WorkOrder`(`scheduledDate`);

-- RepairReport indexes
CREATE INDEX `RepairReport_result_idx` ON `RepairReport`(`result`);
CREATE INDEX `RepairReport_startTime_idx` ON `RepairReport`(`startTime`);
CREATE INDEX `RepairReport_endTime_idx` ON `RepairReport`(`endTime`);

-- Complaint indexes
CREATE INDEX `Complaint_customerName_idx` ON `Complaint`(`customerName`);
CREATE INDEX `Complaint_connectionNumber_idx` ON `Complaint`(`connectionNumber`);
CREATE INDEX `Complaint_category_idx` ON `Complaint`(`category`);
CREATE INDEX `Complaint_phone_idx` ON `Complaint`(`phone`);
