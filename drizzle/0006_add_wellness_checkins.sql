CREATE TABLE `wellness_checkins` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `date_key` text NOT NULL,
  `mood` integer NOT NULL,
  `energy` integer NOT NULL,
  `sleep_hours` real NOT NULL,
  `sleep_quality` integer NOT NULL,
  `stress` integer NOT NULL,
  `soreness` integer NOT NULL,
  `journal` text DEFAULT '' NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wellness_checkins_date_key_unique` ON `wellness_checkins` (`date_key`);
