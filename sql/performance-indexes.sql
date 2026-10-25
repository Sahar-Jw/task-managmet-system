-- Performance indexes for the Task & Project Manager (MySQL 8).
-- Same as backend/src/database/migrations/1724015000000-AddPerformanceIndexes.ts.
-- Use EITHER `npm run migration:run` OR this file, not both (running this by hand
-- and then the migration is fine: the migration skips indexes that already exist,
-- but running this file twice errors with "Duplicate key name").
-- Run during a quiet period; always back up first.

CREATE INDEX idx_tasks_created_at       ON tasks (created_at);
CREATE INDEX idx_tasks_status_assignee  ON tasks (status, assigned_to_id);
CREATE INDEX idx_tasks_archived_at      ON tasks (archived_at);
CREATE INDEX idx_audit_created_at       ON audit_logs (created_at);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);

-- Rollback:
-- DROP INDEX idx_refresh_tokens_expires ON refresh_tokens;
-- DROP INDEX idx_audit_created_at       ON audit_logs;
-- DROP INDEX idx_tasks_archived_at      ON tasks;
-- DROP INDEX idx_tasks_status_assignee  ON tasks;
-- DROP INDEX idx_tasks_created_at       ON tasks;
