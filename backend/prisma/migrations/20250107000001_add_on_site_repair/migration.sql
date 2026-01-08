-- AlterTable: Add repair_location column
ALTER TABLE `problem_tickets` ADD COLUMN `repair_location` VARCHAR(50) NULL;

-- AlterEnum: Add new status values to ProblemTicketStatus enum
-- Note: RETURN_SHIPPED was removed in a previous migration (20251214025557_remove_return_shipped_status)
-- Adding PENDING_APPROVAL and APPROVED_ON_SITE for on-site repair flow
ALTER TABLE `problem_tickets` MODIFY COLUMN `status` ENUM('OPEN', 'PENDING_APPROVAL', 'APPROVED_ON_SITE', 'IN_DELIVERY', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN';

