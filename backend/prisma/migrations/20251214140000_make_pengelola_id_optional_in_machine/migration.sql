-- Make pengelolaId optional in machines table
ALTER TABLE `machines`
MODIFY COLUMN `pengelola_id` CHAR(36) NULL;

