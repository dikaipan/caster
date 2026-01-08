-- Migration: Remove TECHNICIAN role from PengelolaUserRole enum
-- This migration:
-- 1. Updates all users with TECHNICIAN role to SUPERVISOR
-- 2. Removes TECHNICIAN from the enum

-- Step 1: Update all existing users with TECHNICIAN role to SUPERVISOR
UPDATE `pengelola_users`
SET `role` = 'SUPERVISOR'
WHERE `role` = 'TECHNICIAN';

-- Step 2: Change default value from TECHNICIAN to SUPERVISOR
ALTER TABLE `pengelola_users`
MODIFY COLUMN `role` ENUM('SUPERVISOR', 'ADMIN') NOT NULL DEFAULT 'SUPERVISOR';

