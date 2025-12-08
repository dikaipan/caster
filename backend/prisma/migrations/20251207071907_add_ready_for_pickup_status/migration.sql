-- AlterEnum: Add READY_FOR_PICKUP status
ALTER TABLE `cassettes` MODIFY `status` ENUM('OK', 'BAD', 'IN_TRANSIT_TO_RC', 'IN_REPAIR', 'READY_FOR_PICKUP', 'IN_TRANSIT_TO_PENGELOLA', 'SCRAPPED') NOT NULL DEFAULT 'OK';

-- Update existing cassettes: 
-- If cassette is IN_REPAIR and has a COMPLETED repair ticket with qcPassed = true, update to READY_FOR_PICKUP
UPDATE `cassettes` c
INNER JOIN `repair_tickets` rt ON c.id = rt.cassette_id
SET c.status = 'READY_FOR_PICKUP'
WHERE c.status = 'IN_REPAIR'
  AND rt.status = 'COMPLETED'
  AND rt.qc_passed = true
  AND rt.deleted_at IS NULL
  AND rt.id = (
    SELECT rt2.id 
    FROM `repair_tickets` rt2 
    WHERE rt2.cassette_id = c.id 
      AND rt2.deleted_at IS NULL
    ORDER BY rt2.created_at DESC 
    LIMIT 1
  );
