-- Manual Migration: Add soTicketId to repair_tickets table
-- Run this manually if Prisma migrate fails

-- Step 1: Add column
ALTER TABLE `repair_tickets` 
ADD COLUMN `so_ticket_id` CHAR(36) NULL;

-- Step 2: Add index for performance
CREATE INDEX `repair_tickets_so_ticket_id_idx` ON `repair_tickets`(`so_ticket_id`);

-- Step 3: Add foreign key constraint
ALTER TABLE `repair_tickets` 
ADD CONSTRAINT `repair_tickets_so_ticket_id_fkey` 
FOREIGN KEY (`so_ticket_id`) REFERENCES `problem_tickets`(`id`) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: Run backfill script after migration
-- npx ts-node scripts/backfill-so-ticket-id.ts

