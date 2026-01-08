-- AlterTable: Add soTicketId to repair_tickets
ALTER TABLE `repair_tickets` 
ADD COLUMN `so_ticket_id` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `repair_tickets_so_ticket_id_idx` ON `repair_tickets`(`so_ticket_id`);

-- AddForeignKey
ALTER TABLE `repair_tickets` 
ADD CONSTRAINT `repair_tickets_so_ticket_id_fkey` 
FOREIGN KEY (`so_ticket_id`) REFERENCES `problem_tickets`(`id`) 
ON DELETE SET NULL ON UPDATE CASCADE;

