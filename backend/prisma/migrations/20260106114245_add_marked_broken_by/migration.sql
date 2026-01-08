-- Migration: Add markedBrokenBy field to cassettes table
-- This field tracks which user marked the cassette as broken (for undo permission)

ALTER TABLE `cassettes`
ADD COLUMN `marked_broken_by` CHAR(36) NULL AFTER `replacement_ticket_id`;

-- Add index for faster lookups
CREATE INDEX `idx_cassettes_marked_broken_by` ON `cassettes` (`marked_broken_by`);

