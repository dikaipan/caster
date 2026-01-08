-- Remove deprecated signature field from cassette_returns
-- This field is deprecated in favor of rcSignature
-- Field signature was kept for backward compatibility but is no longer needed

-- Step 1: Verify no data in signature field (should be 0 or all NULL)
-- SELECT COUNT(*) as total_returns, COUNT(signature) as has_signature FROM cassette_returns WHERE signature IS NOT NULL;

-- Step 2: Remove deprecated signature column
ALTER TABLE `cassette_returns` 
DROP COLUMN IF EXISTS `signature`;

-- Step 3: Verify removal
-- SELECT COUNT(*) as remaining_returns FROM cassette_returns;

