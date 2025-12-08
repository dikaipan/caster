-- Update all machine modelName to SR7500VS (or keep existing if already SR7500 or SR7500VS)
-- This script updates machines that don't have valid model names (SR7500 or SR7500VS)

UPDATE machines 
SET model_name = 'SR7500VS', 
    updated_at = NOW()
WHERE model_name NOT IN ('SR7500', 'SR7500VS') OR model_name IS NULL;

-- Verify the update
SELECT id, machine_code, model_name, serial_number_manufacturer, updated_at
FROM machines
ORDER BY updated_at DESC
LIMIT 10;

