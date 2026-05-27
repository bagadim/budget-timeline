CREATE TABLE `milestones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`target_cents` integer NOT NULL,
	`target_date` text NOT NULL,
	`created_at` text DEFAULT current_timestamp NOT NULL
);
