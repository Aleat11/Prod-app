CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date_key` text NOT NULL,
	`prompt` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_entries_date_key_unique` ON `journal_entries` (`date_key`);
--> statement-breakpoint
CREATE TABLE `journal_prefs` (
	`id` integer PRIMARY KEY NOT NULL,
	`reminder_enabled` integer DEFAULT true NOT NULL,
	`reminder_time` text DEFAULT '20:30' NOT NULL,
	`updated_at` integer NOT NULL
);
