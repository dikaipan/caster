-- Remove unused Pengelola confirmation fields from cassette_returns
-- These fields were added for dual confirmation flow but are not used in the current RC-only confirmation flow

-- Step 1: Drop foreign key constraint for confirmed_by_pengelola
ALTER TABLE `cassette_returns` 
DROP FOREIGN KEY IF EXISTS `cassette_returns_confirmed_by_pengelola_fkey`;

-- Step 2: Drop index for confirmed_by_pengelola
ALTER TABLE `cassette_returns` 
DROP INDEX IF EXISTS `cassette_returns_confirmed_by_pengelola_fkey`;

-- Step 3: Remove unused columns
ALTER TABLE `cassette_returns` 
DROP COLUMN IF EXISTS `confirmed_by_pengelola`,
DROP COLUMN IF EXISTS `pengelola_confirmed_at`,
DROP COLUMN IF EXISTS `pengelola_signature`;

-- Step 4: Verify removal
-- SELECT COUNT(*) as remaining_returns FROM cassette_returns;

