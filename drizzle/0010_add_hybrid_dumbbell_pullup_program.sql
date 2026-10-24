PRAGMA foreign_keys=OFF;
--> statement-breakpoint
ALTER TABLE sessions RENAME TO sessions_old;
--> statement-breakpoint
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_type TEXT NOT NULL CHECK (session_type IN ('full_body', 'upper', 'lower', 'session_a', 'session_b', 'aerobic')),
  log_json TEXT NOT NULL,
  completed_at INTEGER NOT NULL,
  client_request_id TEXT
);
--> statement-breakpoint
INSERT INTO sessions (id, session_type, log_json, completed_at, client_request_id)
SELECT id, session_type, log_json, completed_at, client_request_id FROM sessions_old;
--> statement-breakpoint
DROP TABLE sessions_old;
--> statement-breakpoint
CREATE UNIQUE INDEX sessions_client_request_id_unique ON sessions (client_request_id);
--> statement-breakpoint
ALTER TABLE upcoming_sessions RENAME TO upcoming_sessions_old;
--> statement-breakpoint
CREATE TABLE upcoming_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_type TEXT NOT NULL CHECK (session_type IN ('full_body', 'upper', 'lower', 'session_a', 'session_b', 'aerobic')),
  plan_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
INSERT INTO upcoming_sessions (id, session_type, plan_json, created_at, consumed)
SELECT id, session_type, plan_json, created_at, consumed FROM upcoming_sessions_old;
--> statement-breakpoint
DROP TABLE upcoming_sessions_old;
--> statement-breakpoint
CREATE TABLE `assessments` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `kind` text NOT NULL DEFAULT 'session0',
  `hang_seconds` real NOT NULL,
  `scap_pull_reps` integer NOT NULL,
  `pushup_reps` integer NOT NULL,
  `pushup_surface` text NOT NULL DEFAULT '',
  `split_squat_left` integer NOT NULL,
  `split_squat_right` integer NOT NULL,
  `chair_squat_reps` integer NOT NULL,
  `sit_reach_cm` real NOT NULL,
  `squat_hold_seconds` real NOT NULL,
  `wall_wrists_touch` integer NOT NULL DEFAULT false,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `flexibility_days` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `date_key` text NOT NULL,
  `completed` integer NOT NULL DEFAULT false,
  `duration_seconds` integer NOT NULL DEFAULT 30,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flexibility_days_date_key_unique` ON `flexibility_days` (`date_key`);
--> statement-breakpoint
ALTER TABLE `settings` ADD COLUMN `dumbbell_description` text;
--> statement-breakpoint
ALTER TABLE `settings` ADD COLUMN `bar_type` text;
--> statement-breakpoint
INSERT INTO settings (id, updated_at, dumbbell_description, bar_type) VALUES (1, 0, 'Pair of adjustable dumbbells, 10-20 lb each (spin-lock, plates) + one single 25 lb dumbbell', 'door-mounted')
ON CONFLICT(id) DO UPDATE SET dumbbell_description = COALESCE(settings.dumbbell_description, excluded.dumbbell_description), bar_type = COALESCE(settings.bar_type, excluded.bar_type);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
