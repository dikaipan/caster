-- Migration: Remove RETURN_SHIPPED status from ProblemTicketStatus enum
-- Run this SQL manually in MySQL if Prisma migrate fails

-- Step 1: Update all tickets with RETURN_SHIPPED status to CLOSED
-- This ensures no data is lost and all tickets are in a valid state
UPDATE problem_tickets 
SET status = 'CLOSED',
    updated_at = NOW()
WHERE status = 'RETURN_SHIPPED';

-- Step 2: Remove RETURN_SHIPPED from enum
-- Note: MySQL doesn't support DROP VALUE from ENUM directly
-- We need to recreate the enum without RETURN_SHIPPED
ALTER TABLE problem_tickets 
MODIFY COLUMN status ENUM('OPEN', 'IN_DELIVERY', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN';

-- Verification: Check if any RETURN_SHIPPED tickets remain (should return 0)
SELECT COUNT(*) as return_shipped_count 
FROM problem_tickets 
WHERE status = 'RETURN_SHIPPED';

-- Verification: Check enum values (should not include RETURN_SHIPPED)
SHOW COLUMNS FROM problem_tickets WHERE Field = 'status';

