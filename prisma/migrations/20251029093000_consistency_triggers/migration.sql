-- Backfill Complaint linkage from normalized chain
UPDATE `Complaint` c
LEFT JOIN `WorkOrder` w ON w.`serviceRequestId` = c.`serviceRequestId`
SET c.`workOrderId` = w.`id`
WHERE c.`serviceRequestId` IS NOT NULL AND (c.`workOrderId` IS NULL OR c.`workOrderId` <> w.`id`);

UPDATE `Complaint` c
LEFT JOIN `RepairReport` r ON r.`workOrderId` = c.`workOrderId`
SET c.`repairReportId` = r.`id`
WHERE c.`workOrderId` IS NOT NULL AND (c.`repairReportId` IS NULL OR c.`repairReportId` <> r.`id`);

-- Triggers to keep Complaint link fields in sync with SR→WO→RR chain
DROP TRIGGER IF EXISTS `trg_workorder_after_insert`;
CREATE TRIGGER `trg_workorder_after_insert`
AFTER INSERT ON `WorkOrder` FOR EACH ROW
  UPDATE `Complaint` SET `workOrderId` = NEW.`id`
  WHERE NEW.`serviceRequestId` IS NOT NULL AND `serviceRequestId` = NEW.`serviceRequestId`;

DROP TRIGGER IF EXISTS `trg_workorder_after_update`;
CREATE TRIGGER `trg_workorder_after_update`
AFTER UPDATE ON `WorkOrder` FOR EACH ROW
  UPDATE `Complaint` SET `workOrderId` = NEW.`id`
  WHERE NEW.`serviceRequestId` IS NOT NULL AND `serviceRequestId` = NEW.`serviceRequestId`;

DROP TRIGGER IF EXISTS `trg_repairreport_after_insert`;
CREATE TRIGGER `trg_repairreport_after_insert`
AFTER INSERT ON `RepairReport` FOR EACH ROW
  UPDATE `Complaint` SET `repairReportId` = NEW.`id`
  WHERE NEW.`workOrderId` IS NOT NULL AND `workOrderId` = NEW.`workOrderId`;

DROP TRIGGER IF EXISTS `trg_repairreport_after_update`;
CREATE TRIGGER `trg_repairreport_after_update`
AFTER UPDATE ON `RepairReport` FOR EACH ROW
  UPDATE `Complaint` SET `repairReportId` = NEW.`id`
  WHERE NEW.`workOrderId` IS NOT NULL AND `workOrderId` = NEW.`workOrderId`;
