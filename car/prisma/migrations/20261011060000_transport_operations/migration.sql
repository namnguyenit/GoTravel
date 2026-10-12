-- Additive; apply only in the release environment after backup.
ALTER TABLE operator_staff ADD COLUMN can_manage_trip boolean NOT NULL DEFAULT false,
 ADD COLUMN can_close_shift boolean NOT NULL DEFAULT false,
 ADD COLUMN trip_ids text[] NOT NULL DEFAULT '{}';
ALTER TABLE seat_templates ADD COLUMN "row" integer NOT NULL DEFAULT 0 CHECK ("row" >= 0),
 ADD COLUMN "column" integer NOT NULL DEFAULT 0 CHECK ("column" >= 0);
ALTER TABLE trips ADD COLUMN sale_snapshot jsonb, ADD COLUMN class_prices jsonb,
 ADD COLUMN publish_attempts integer NOT NULL DEFAULT 0,
 ADD COLUMN publish_retry_at timestamp(3), ADD COLUMN publish_error text,
 ADD COLUMN completion_synced_at timestamp(3);
ALTER TYPE "IssuedTicketStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';
CREATE TABLE transport_quotes (
 id text PRIMARY KEY, trip_id text NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 version text NOT NULL, hash text NOT NULL, payload jsonb NOT NULL,
 expires_at timestamp(3) NOT NULL, order_id text UNIQUE,
 created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX transport_quotes_expiry_idx ON transport_quotes(expires_at);
CREATE TABLE transport_audit (
 id text PRIMARY KEY, actor_id text NOT NULL, trip_id text,
 action text NOT NULL, detail jsonb NOT NULL,
 created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX transport_audit_trip_idx ON transport_audit(trip_id,created_at);
CREATE FUNCTION transport_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Transport audit is append-only'; END;
$$;
CREATE TRIGGER transport_audit_immutable BEFORE UPDATE OR DELETE ON transport_audit
 FOR EACH ROW EXECUTE FUNCTION transport_audit_immutable();

DROP INDEX uq_active_ticket_for_trip_seat;
CREATE UNIQUE INDEX uq_active_ticket_for_trip_seat ON issued_tickets(trip_id,seat_id)
 WHERE status <> 'VOID';
