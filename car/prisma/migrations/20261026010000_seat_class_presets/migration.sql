CREATE TABLE IF NOT EXISTS operator_seat_classes (
  id TEXT PRIMARY KEY,
  operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  code VARCHAR(32) NOT NULL,
  label VARCHAR(80) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT operator_seat_classes_operator_id_code_key UNIQUE (operator_id, code)
);
