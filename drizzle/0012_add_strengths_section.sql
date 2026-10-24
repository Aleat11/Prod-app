CREATE TABLE `strengths_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`top_themes_json` text DEFAULT '[]' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`full_ranking_json` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `strengths_reflections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`theme_name` text NOT NULL,
	`body` text NOT NULL,
	`kind` text DEFAULT 'moment' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `strengths_commitments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`theme_name` text NOT NULL,
	`text` text NOT NULL,
	`done` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `strengths_sorter_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`top_themes_json` text DEFAULT '[]' NOT NULL,
	`scores_json` text DEFAULT '{}' NOT NULL,
	`answers_json` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL
);
