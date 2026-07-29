ALTER TABLE `portrait_dna_versions` ADD `engine_version` text DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `prompt_modules` ADD `engine_version` text DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `compiled_prompts` ADD `module_order_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `compiled_prompts` ADD `engine_version` text DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE `portrait_candidates` ADD `quality_score_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `portrait_candidates` ADD `review_checklist_json` text DEFAULT '{}' NOT NULL;
