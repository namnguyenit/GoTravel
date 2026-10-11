CREATE TABLE IF NOT EXISTS transport_reconciliation_findings (
    order_id uuid NOT NULL REFERENCES orders(id),
    issue_code varchar(64) NOT NULL,
    status varchar(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
    detail varchar(1000),
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    PRIMARY KEY (order_id, issue_code)
);
CREATE INDEX IF NOT EXISTS idx_transport_reconciliation_open
    ON transport_reconciliation_findings(status,last_seen_at) WHERE status='OPEN';

CREATE TABLE IF NOT EXISTS transport_reconciliation_notes (
    id uuid PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES orders(id),
    issue_code varchar(64) NOT NULL,
    actor_id uuid NOT NULL,
    note varchar(1000) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (order_id,issue_code)
        REFERENCES transport_reconciliation_findings(order_id,issue_code)
);
CREATE OR REPLACE FUNCTION reject_transport_reconciliation_note_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Reconciliation notes are append-only';
END;
$$;
DROP TRIGGER IF EXISTS transport_reconciliation_notes_immutable ON transport_reconciliation_notes;
CREATE TRIGGER transport_reconciliation_notes_immutable BEFORE UPDATE OR DELETE ON transport_reconciliation_notes
    FOR EACH ROW EXECUTE FUNCTION reject_transport_reconciliation_note_change();
