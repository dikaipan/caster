-- Migration: Remove RETURN_SHIPPED status from ProblemTicketStatus enum
-- This migration safely removes RETURN_SHIPPED status by:
-- 1. Updating all tickets with RETURN_SHIPPED status to CLOSED
-- 2. Removing RETURN_SHIPPED from the enum

-- Step 1: Update all tickets with RETURN_SHIPPED status to CLOSED
-- This ensures no data is lost and all tickets are in a valid state
UPDATE problem_tickets 
SET status = 'CLOSED',
    updated_at = NOW()
WHERE status = 'RETURN_SHIPPED';

-- Step 2: Remove RETURN_SHIPPED from enum
-- Note: MySQL doesn't support DROP VALUE from ENUM directly
-- We need to recreate the enum without RETURN_SHIPPED
-- This is done by ALTER TABLE with MODIFY COLUMN

ALTER TABLE problem_tickets 
MODIFY COLUMN status ENUM('OPEN', 'IN_DELIVERY', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN';
