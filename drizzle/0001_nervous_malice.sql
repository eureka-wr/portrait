CREATE TABLE `portrait_refinements` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`source_candidate_id` text NOT NULL,
	`request_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
