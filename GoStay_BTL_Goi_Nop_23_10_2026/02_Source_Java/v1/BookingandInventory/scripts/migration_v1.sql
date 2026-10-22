-- Apply to PostgreSQL before starting the patched v1. Back up the database first.
ALTER TABLE inventory_locks ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
ALTER TABLE inventory_configs ADD COLUMN IF NOT EXISTS owner_id uuid;
-- Assign each existing owner_id from trusted Catalog data. Unassigned listings deny Host access.
-- Do not infer ownership from a caller-supplied listing UUID.
