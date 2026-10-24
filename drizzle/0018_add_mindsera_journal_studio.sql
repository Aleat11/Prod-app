ALTER TABLE `journal_entries` ADD COLUMN `framework` text DEFAULT 'daily' NOT NULL;
--> statement-breakpoint
ALTER TABLE `journal_entries` ADD COLUMN `emotions_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `journal_entries` ADD COLUMN `themes_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `journal_entries` ADD COLUMN `insight` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE `journal_deeper_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_date_key` text NOT NULL,
	`role` text NOT NULL,
	`preset` text DEFAULT '' NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal_mind_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_date_key` text NOT NULL,
	`mind` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_mind_comments_entry_mind_unique` ON `journal_mind_comments` (`entry_date_key`, `mind`);
--> statement-breakpoint
CREATE TABLE `journal_ask_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
