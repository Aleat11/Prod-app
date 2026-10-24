CREATE TABLE `decisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date_key` text NOT NULL,
	`dilemma` text NOT NULL,
	`options` text NOT NULL,
	`pick` text,
	`reasoning` text,
	`pattern_note` text,
	`first_step` text,
	`commitment` text,
	`if_then` text,
	`revisit_date` text,
	`outcome` text,
	`followed_through` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`reopen_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hs_app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hs_profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`pattern` text DEFAULT '' NOT NULL,
	`scores` text DEFAULT '' NOT NULL,
	`answers` text DEFAULT '' NOT NULL,
	`identity_statement` text DEFAULT '' NOT NULL,
	`values_list` text DEFAULT '' NOT NULL,
	`non_negotiables` text DEFAULT '' NOT NULL,
	`never_does` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hs_facts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fact` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hs_proof` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hs_chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hs_reframes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`thought` text NOT NULL,
	`answer` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hs_letters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_key` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hs_letters_week_key_unique` ON `hs_letters` (`week_key`);
