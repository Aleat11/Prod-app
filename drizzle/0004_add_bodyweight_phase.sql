PRAGMA foreign_keys=OFF;
--> statement-breakpoint
ALTER TABLE sessions RENAME TO sessions_old;
--> statement-breakpoint
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_type TEXT NOT NULL CHECK (session_type IN ('full_body', 'upper', 'lower')),
  log_json TEXT NOT NULL,
  completed_at INTEGER NOT NULL
);
--> statement-breakpoint
INSERT INTO sessions (id, session_type, log_json, completed_at)
SELECT id, session_type, log_json, completed_at FROM sessions_old;
--> statement-breakpoint
DROP TABLE sessions_old;
--> statement-breakpoint
ALTER TABLE upcoming_sessions RENAME TO upcoming_sessions_old;
--> statement-breakpoint
CREATE TABLE upcoming_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_type TEXT NOT NULL CHECK (session_type IN ('full_body', 'upper', 'lower')),
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
PRAGMA foreign_keys=ON;
