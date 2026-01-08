-- DropForeignKey
ALTER TABLE `machines` DROP FOREIGN KEY `machines_pengelola_id_fkey`;

-- DropIndex
DROP INDEX `cassettes_serial_number_idx` ON `cassettes`;

-- AlterTable
ALTER TABLE `customers_banks` MODIFY `bank_code` VARCHAR(50) NOT NULL;

-- AlterTable
ALTER TABLE `hitachi_users` ADD COLUMN `two_factor_backup_codes` TEXT NULL,
    ADD COLUMN `two_factor_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `two_factor_secret` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `pengelola_users` ADD COLUMN `two_factor_backup_codes` TEXT NULL,
    ADD COLUMN `two_factor_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `two_factor_secret` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `repair_tickets` ADD COLUMN `diagnosing_start_at` DATETIME(3) NULL,
    ADD COLUMN `other_parts_replaced` LONGTEXT NULL,
    ADD COLUMN `repair_start_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `customers_banks_bank_name_idx` ON `customers_banks`(`bank_name`);

-- CreateIndex
CREATE INDEX `customers_banks_primary_contact_email_idx` ON `customers_banks`(`primary_contact_email`);

-- CreateIndex
CREATE INDEX `hitachi_users_status_idx` ON `hitachi_users`(`status`);

-- CreateIndex
CREATE INDEX `hitachi_users_role_idx` ON `hitachi_users`(`role`);

-- CreateIndex
CREATE INDEX `hitachi_users_full_name_idx` ON `hitachi_users`(`full_name`);

-- CreateIndex
CREATE INDEX `machines_city_idx` ON `machines`(`city`);

-- CreateIndex
CREATE INDEX `machines_current_wsid_idx` ON `machines`(`current_wsid`);

-- CreateIndex
CREATE INDEX `pengelola_company_name_idx` ON `pengelola`(`company_name`);

-- CreateIndex
CREATE INDEX `pengelola_users_full_name_idx` ON `pengelola_users`(`full_name`);

-- AddForeignKey
ALTER TABLE `machines` ADD CONSTRAINT `machines_pengelola_id_fkey` FOREIGN KEY (`pengelola_id`) REFERENCES `pengelola`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
