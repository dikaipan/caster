-- CreateIndex
CREATE INDEX `bank_pengelola_assignments_customer_bank_id_idx` ON `bank_pengelola_assignments`(`customer_bank_id`);

-- CreateIndex
CREATE INDEX `bank_pengelola_assignments_status_idx` ON `bank_pengelola_assignments`(`status`);

-- CreateIndex
CREATE INDEX `bank_pengelola_assignments_customer_bank_id_status_idx` ON `bank_pengelola_assignments`(`customer_bank_id`, `status`);

-- CreateIndex (may already exist from foreign key, but will be created with different name)
CREATE INDEX `bank_pengelola_assignments_pengelola_id_idx` ON `bank_pengelola_assignments`(`pengelola_id`);

-- CreateIndex
CREATE INDEX `cassette_deliveries_ticket_id_idx` ON `cassette_deliveries`(`ticket_id`);

-- CreateIndex
CREATE INDEX `cassette_deliveries_shipped_date_idx` ON `cassette_deliveries`(`shipped_date`);

-- CreateIndex
CREATE INDEX `cassette_deliveries_received_at_rc_idx` ON `cassette_deliveries`(`received_at_rc`);

-- CreateIndex
CREATE INDEX `cassette_deliveries_cassette_id_shipped_date_idx` ON `cassette_deliveries`(`cassette_id`, `shipped_date`);

-- CreateIndex (may already exist from foreign key, but will be created with different name)
CREATE INDEX `cassette_deliveries_cassette_id_idx` ON `cassette_deliveries`(`cassette_id`);

-- CreateIndex
CREATE INDEX `cassette_deliveries_received_by_idx` ON `cassette_deliveries`(`received_by`);

-- CreateIndex
CREATE INDEX `cassette_deliveries_sent_by_idx` ON `cassette_deliveries`(`sent_by`);

-- CreateIndex
CREATE INDEX `cassette_returns_ticket_id_idx` ON `cassette_returns`(`ticket_id`);

-- CreateIndex
CREATE INDEX `cassette_returns_shipped_date_idx` ON `cassette_returns`(`shipped_date`);

-- CreateIndex
CREATE INDEX `cassette_returns_received_at_pengelola_idx` ON `cassette_returns`(`received_at_pengelola`);

-- CreateIndex
CREATE INDEX `cassette_returns_cassette_id_shipped_date_idx` ON `cassette_returns`(`cassette_id`, `shipped_date`);

-- CreateIndex (may already exist from foreign key, but will be created with different name)
CREATE INDEX `cassette_returns_cassette_id_idx` ON `cassette_returns`(`cassette_id`);

-- CreateIndex
CREATE INDEX `cassette_returns_received_by_idx` ON `cassette_returns`(`received_by`);

-- CreateIndex
CREATE INDEX `cassette_returns_sent_by_idx` ON `cassette_returns`(`sent_by`);

-- CreateIndex (may already exist from unique constraint, but explicit for clarity)
CREATE INDEX `cassettes_serial_number_idx` ON `cassettes`(`serial_number`);

-- CreateIndex
CREATE INDEX `machine_identifier_history_identifier_type_idx` ON `machine_identifier_history`(`identifier_type`);

-- CreateIndex
CREATE INDEX `machine_identifier_history_changed_at_idx` ON `machine_identifier_history`(`changed_at`);

-- CreateIndex
CREATE INDEX `machine_identifier_history_machine_id_changed_at_idx` ON `machine_identifier_history`(`machine_id`, `changed_at`);

-- CreateIndex (may already exist from foreign key, but will be created with different name)
CREATE INDEX `machine_identifier_history_machine_id_idx` ON `machine_identifier_history`(`machine_id`);

-- CreateIndex
CREATE INDEX `pengelola_users_status_idx` ON `pengelola_users`(`status`);

-- CreateIndex
CREATE INDEX `pengelola_users_role_idx` ON `pengelola_users`(`role`);

-- CreateIndex
CREATE INDEX `pengelola_users_pengelola_id_status_idx` ON `pengelola_users`(`pengelola_id`, `status`);

-- CreateIndex (may already exist from foreign key, but will be created with different name)
CREATE INDEX `pengelola_users_pengelola_id_idx` ON `pengelola_users`(`pengelola_id`);

-- CreateIndex
CREATE INDEX `problem_tickets_deleted_at_idx` ON `problem_tickets`(`deleted_at`);

-- CreateIndex
CREATE INDEX `problem_tickets_closed_at_idx` ON `problem_tickets`(`closed_at`);

-- CreateIndex
CREATE INDEX `problem_tickets_resolved_at_idx` ON `problem_tickets`(`resolved_at`);

-- CreateIndex
CREATE INDEX `problem_tickets_status_reported_at_idx` ON `problem_tickets`(`status`, `reported_at`);

-- CreateIndex
CREATE INDEX `problem_tickets_reported_by_status_idx` ON `problem_tickets`(`reported_by`, `status`);

-- CreateIndex
CREATE INDEX `ticket_cassette_details_ticket_id_idx` ON `ticket_cassette_details`(`ticket_id`);

-- CreateIndex
CREATE INDEX `ticket_cassette_details_ticket_id_cassette_id_idx` ON `ticket_cassette_details`(`ticket_id`, `cassette_id`);
