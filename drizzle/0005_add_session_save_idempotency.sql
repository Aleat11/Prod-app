ALTER TABLE sessions ADD COLUMN client_request_id TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX sessions_client_request_id_unique ON sessions (client_request_id);
