-- Direct SQL to apply RETURN_SHIPPED removal migration
-- Run this in MySQL command line or phpMyAdmin

USE caster;

-- Step 1: Check current RETURN_SHIPPED tickets
SELECT COUNT(*) as return_shipped_count 
FROM problem_tickets 
WHERE status = 'RETURN_SHIPPED';

-- Step 2: Update all RETURN_SHIPPED tickets to CLOSED
UPDATE problem_tickets 
SET status = 'CLOSED',
    updated_at = NOW()
WHERE status = 'RETURN_SHIPPED';

-- Step 3: Verify update
SELECT COUNT(*) as remaining_return_shipped 
FROM problem_tickets 
WHERE status = 'RETURN_SHIPPED';

-- Step 4: Remove RETURN_SHIPPED from enum
ALTER TABLE problem_tickets 
MODIFY COLUMN status ENUM('OPEN', 'IN_DELIVERY', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN';

-- Step 5: Verify enum
SHOW COLUMNS FROM problem_tickets WHERE Field = 'status';

-- Step 6: Final check
SELECT status, COUNT(*) as count 
FROM problem_tickets 
GROUP BY status 
ORDER BY status;

