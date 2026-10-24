CREATE TABLE `nightly_checks` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `date_key` text NOT NULL,
  `something_good` text DEFAULT '' NOT NULL,
  `something_hard` text DEFAULT '' NOT NULL,
  `something_kind` text DEFAULT '' NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nightly_checks_date_key_unique` ON `nightly_checks` (`date_key`);
