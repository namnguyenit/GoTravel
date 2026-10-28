ALTER TABLE cars ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS cars_operator_id_deleted_at_idx ON cars(operator_id, deleted_at);
