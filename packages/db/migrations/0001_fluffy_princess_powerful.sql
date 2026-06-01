CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`month` text NOT NULL,
	`amount_minor` integer DEFAULT 0 NOT NULL,
	`color` text,
	`created_at` text DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE `flow_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flow_id` integer NOT NULL,
	`amount_minor` integer DEFAULT 0 NOT NULL,
	`start_month` text NOT NULL,
	`end_month` text,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `flows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`starting_savings_minor` integer DEFAULT 0 NOT NULL,
	`start_month` text NOT NULL,
	`currency` text DEFAULT 'PLN' NOT NULL,
	`horizon_years` integer DEFAULT 5 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `taxes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`mode` text NOT NULL,
	`rate_bps` integer,
	`amount_minor` integer,
	`color` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT current_timestamp NOT NULL
);
--> statement-breakpoint
DROP TABLE `milestones`;