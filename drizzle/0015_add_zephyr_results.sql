CREATE TABLE `zephyr_results` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `test_id` text NOT NULL,
  `test_title` text NOT NULL,
  `category` text NOT NULL,
  `score` real NOT NULL,
  `max_score` real NOT NULL,
  `band_label` text NOT NULL,
  `band_summary` text NOT NULL,
  `taken_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zephyr_results_test_taken_unique` ON `zephyr_results` (`test_id`, `taken_at`);
