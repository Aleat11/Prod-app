DROP TABLE entries;
--> statement-breakpoint
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_type TEXT NOT NULL CHECK (session_type IN ('upper', 'lower')),
  log_json TEXT NOT NULL,
  completed_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE settings (
  id INTEGER PRIMARY KEY,
  smallest_jump REAL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE upcoming_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_type TEXT NOT NULL CHECK (session_type IN ('upper', 'lower')),
  plan_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0
);
