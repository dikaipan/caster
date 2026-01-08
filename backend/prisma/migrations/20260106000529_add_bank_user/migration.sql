-- CreateTable
CREATE TABLE `bank_users` (
    `id` CHAR(36) NOT NULL,
    `customer_bank_id` CHAR(36) NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `role` ENUM('VIEWER') NOT NULL DEFAULT 'VIEWER',
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `last_login` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `two_factor_secret` VARCHAR(255) NULL,
    `two_factor_enabled` BOOLEAN NOT NULL DEFAULT false,
    `two_factor_backup_codes` TEXT NULL,

    UNIQUE INDEX `bank_users_username_key`(`username`),
    UNIQUE INDEX `bank_users_email_key`(`email`),
    INDEX `bank_users_customer_bank_id_idx`(`customer_bank_id`),
    INDEX `bank_users_status_idx`(`status`),
    INDEX `bank_users_username_idx`(`username`),
    INDEX `bank_users_email_idx`(`email`),
    INDEX `bank_users_customer_bank_id_status_idx`(`customer_bank_id`, `status`),
    INDEX `bank_users_full_name_idx`(`full_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bank_users` ADD CONSTRAINT `bank_users_customer_bank_id_fkey` FOREIGN KEY (`customer_bank_id`) REFERENCES `customers_banks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
