CREATE TABLE `daily_focus` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `date_key` text NOT NULL,
  `frog` text NOT NULL DEFAULT '',
  `frog_reason` text NOT NULL DEFAULT '',
  `task_two` text NOT NULL DEFAULT '',
  `task_three` text NOT NULL DEFAULT '',
  `frog_started_at` integer,
  `frog_completed` integer NOT NULL DEFAULT false,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_focus_date_key_unique` ON `daily_focus` (`date_key`);
--> statement-breakpoint
CREATE TABLE `parking_lot_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `date_key` text NOT NULL,
  `text` text NOT NULL,
  `cleared` integer NOT NULL DEFAULT false,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `focus_blocks` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `date_key` text NOT NULL,
  `task` text NOT NULL,
  `planned_minutes` integer NOT NULL,
  `actual_minutes` integer NOT NULL,
  `focus_rating` integer NOT NULL,
  `completed_at` integer NOT NULL
);