CREATE TABLE `candidate_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`source` text NOT NULL,
	`selected` integer NOT NULL,
	`positive_reasons_json` text DEFAULT '[]' NOT NULL,
	`negative_reasons_json` text DEFAULT '[]' NOT NULL,
	`free_text` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `compiled_prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`positive_prompt` text NOT NULL,
	`negative_prompt` text NOT NULL,
	`structured_payload_json` text DEFAULT '{}' NOT NULL,
	`module_versions_json` text NOT NULL,
	`portrait_dna_id` text NOT NULL,
	`portrait_dna_version` text NOT NULL,
	`compiler_version` text NOT NULL,
	`checksum` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`status` text NOT NULL,
	`provider_name` text NOT NULL,
	`requested_count` integer NOT NULL,
	`completed_count` integer DEFAULT 0 NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`max_retries` integer DEFAULT 1 NOT NULL,
	`failure_reason` text,
	`idempotency_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generation_jobs_idempotency_key_unique` ON `generation_jobs` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `portrait_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`candidate_id` text,
	`kind` text NOT NULL,
	`storage_provider` text NOT NULL,
	`storage_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`width` integer,
	`height` integer,
	`size_bytes` integer,
	`is_private` integer DEFAULT true NOT NULL,
	`checksum` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `portrait_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`operator_id` text NOT NULL,
	`order_id` text,
	`resource_id` text,
	`action` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `portrait_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`generation_job_id` text NOT NULL,
	`portrait_dna_id` text NOT NULL,
	`portrait_dna_version` text NOT NULL,
	`provider_name` text NOT NULL,
	`provider_model` text,
	`compiled_prompt_id` text NOT NULL,
	`master_asset_id` text,
	`status` text NOT NULL,
	`operator_rating` integer,
	`operator_notes` text,
	`rejection_reasons_json` text DEFAULT '[]' NOT NULL,
	`quality_score` real,
	`variant` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `portrait_dna_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`style_id` text NOT NULL,
	`version` text NOT NULL,
	`status` text NOT NULL,
	`modules_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portrait_dna_style_version_unique` ON `portrait_dna_versions` (`style_id`,`version`);--> statement-breakpoint
CREATE TABLE `portrait_experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`style_id` text NOT NULL,
	`control_version` text NOT NULL,
	`variant_version` text NOT NULL,
	`status` text NOT NULL,
	`allocation_percent` integer NOT NULL,
	`started_at` text,
	`completed_at` text
);
--> statement-breakpoint
CREATE TABLE `portrait_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`customer_nickname` text,
	`customer_contact_note` text,
	`source_channel` text NOT NULL,
	`selected_style_id` text NOT NULL,
	`selected_style_version` text NOT NULL,
	`status` text NOT NULL,
	`price_fen` integer DEFAULT 990 NOT NULL,
	`currency` text DEFAULT 'CNY' NOT NULL,
	`payment_status` text NOT NULL,
	`customer_requirements` text,
	`internal_notes` text,
	`assigned_operator_id` text,
	`experiment_id` text,
	`experiment_variant` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	`expires_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portrait_orders_order_number_unique` ON `portrait_orders` (`order_number`);--> statement-breakpoint
CREATE TABLE `portrait_styles` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`public_name` text NOT NULL,
	`public_name_zh` text NOT NULL,
	`internal_reference_name` text,
	`description` text NOT NULL,
	`current_version` text NOT NULL,
	`status` text NOT NULL,
	`accent` text NOT NULL,
	`traits_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portrait_styles_slug_unique` ON `portrait_styles` (`slug`);--> statement-breakpoint
CREATE TABLE `portrait_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portrait_users_email_unique` ON `portrait_users` (`email`);--> statement-breakpoint
CREATE TABLE `prompt_modules` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`version` text NOT NULL,
	`positive_prompt` text NOT NULL,
	`negative_prompt` text,
	`parameters_json` text DEFAULT '{}' NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prompt_module_slug_version_unique` ON `prompt_modules` (`slug`,`version`);