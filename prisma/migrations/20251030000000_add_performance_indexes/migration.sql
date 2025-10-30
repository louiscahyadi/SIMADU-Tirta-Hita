/**
 * Create database migration for performance indexes
 * Run: npx prisma migrate dev --name add_performance_indexes
 */

-- This migration adds indexes to improve query performance

-- ServiceRequest indexes
CREATE INDEX IF NOT EXISTS `ServiceRequest_customerName_idx` ON `ServiceRequest`(`customerName`);
CREATE INDEX IF NOT EXISTS `ServiceRequest_serviceNumber_idx` ON `ServiceRequest`(`serviceNumber`);
CREATE INDEX IF NOT EXISTS `ServiceRequest_reporterName_idx` ON `ServiceRequest`(`reporterName`);
CREATE INDEX IF NOT EXISTS `ServiceRequest_requestDate_idx` ON `ServiceRequest`(`requestDate`);
CREATE INDEX IF NOT EXISTS `ServiceRequest_urgency_idx` ON `ServiceRequest`(`urgency`);

-- WorkOrder indexes
CREATE INDEX IF NOT EXISTS `WorkOrder_number_idx` ON `WorkOrder`(`number`);
CREATE INDEX IF NOT EXISTS `WorkOrder_disturbanceLocation_idx` ON `WorkOrder`(`disturbanceLocation`);
CREATE INDEX IF NOT EXISTS `WorkOrder_team_idx` ON `WorkOrder`(`team`);
CREATE INDEX IF NOT EXISTS `WorkOrder_scheduledDate_idx` ON `WorkOrder`(`scheduledDate`);

-- RepairReport indexes
CREATE INDEX IF NOT EXISTS `RepairReport_result_idx` ON `RepairReport`(`result`);
CREATE INDEX IF NOT EXISTS `RepairReport_startTime_idx` ON `RepairReport`(`startTime`);
CREATE INDEX IF NOT EXISTS `RepairReport_endTime_idx` ON `RepairReport`(`endTime`);

-- Complaint indexes
CREATE INDEX IF NOT EXISTS `Complaint_customerName_idx` ON `Complaint`(`customerName`);
CREATE INDEX IF NOT EXISTS `Complaint_connectionNumber_idx` ON `Complaint`(`connectionNumber`);
CREATE INDEX IF NOT EXISTS `Complaint_category_idx` ON `Complaint`(`category`);
CREATE INDEX IF NOT EXISTS `Complaint_phone_idx` ON `Complaint`(`phone`);
