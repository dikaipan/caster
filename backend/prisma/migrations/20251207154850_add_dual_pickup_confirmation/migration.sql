-- AlterTable
ALTER TABLE `cassette_returns` ADD COLUMN `confirmed_by_pengelola` CHAR(36) NULL,
    ADD COLUMN `confirmed_by_rc` CHAR(36) NULL,
    ADD COLUMN `pengelola_confirmed_at` DATETIME(3) NULL,
    ADD COLUMN `pengelola_signature` TEXT NULL,
    ADD COLUMN `rc_confirmed_at` DATETIME(3) NULL,
    ADD COLUMN `rc_signature` TEXT NULL;

-- AddForeignKey
ALTER TABLE `cassette_returns` ADD CONSTRAINT `cassette_returns_confirmed_by_rc_fkey` FOREIGN KEY (`confirmed_by_rc`) REFERENCES `hitachi_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cassette_returns` ADD CONSTRAINT `cassette_returns_confirmed_by_pengelola_fkey` FOREIGN KEY (`confirmed_by_pengelola`) REFERENCES `pengelola_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
