-- Manual refund attestation. This table records evidence after an external
-- transfer or provider refund has actually been completed by an operator.
ALTER TABLE host_payouts ADD COLUMN IF NOT EXISTS provider_type varchar(16) NOT NULL DEFAULT 'HOST';
CREATE TABLE IF NOT EXISTS transport_manual_refunds (
    id uuid PRIMARY KEY,
    order_id uuid NOT NULL UNIQUE REFERENCES payment_requests(order_id),
    amount numeric(18,0) NOT NULL CHECK (amount > 0),
    fee_amount numeric(18,0) NOT NULL DEFAULT 0,
    fee_commission numeric(18,0) NOT NULL DEFAULT 0,
    fee_operator_amount numeric(18,0) NOT NULL DEFAULT 0,
    reference varchar(160) NOT NULL UNIQUE,
    evidence_url varchar(1000) NOT NULL,
    recorded_by uuid NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION reject_transport_refund_evidence_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Refund evidence is append-only';
END;
$$;
DROP TRIGGER IF EXISTS transport_manual_refunds_immutable ON transport_manual_refunds;
CREATE TRIGGER transport_manual_refunds_immutable BEFORE UPDATE OR DELETE ON transport_manual_refunds
    FOR EACH ROW EXECUTE FUNCTION reject_transport_refund_evidence_change();

CREATE TABLE IF NOT EXISTS transport_cash_settlements (
    shift_id uuid PRIMARY KEY,
    operator_id uuid NOT NULL,
    gross_amount numeric(18,0) NOT NULL CHECK (gross_amount >= 0),
    commission_due numeric(18,0) NOT NULL CHECK (commission_due >= 0),
    commission_rate numeric(8,6) NOT NULL CHECK (commission_rate >= 0 AND commission_rate < 1),
    commission_version varchar(40) NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION reject_transport_cash_settlement_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Cash settlement is append-only';
END;
$$;
DROP TRIGGER IF EXISTS transport_cash_settlements_immutable ON transport_cash_settlements;
CREATE TRIGGER transport_cash_settlements_immutable BEFORE UPDATE OR DELETE ON transport_cash_settlements
    FOR EACH ROW EXECUTE FUNCTION reject_transport_cash_settlement_change();

CREATE TABLE IF NOT EXISTS transport_cash_refund_adjustments (
    order_id uuid PRIMARY KEY,
    shift_id uuid NOT NULL,
    operator_id uuid NOT NULL,
    refund_amount numeric(18,0) NOT NULL CHECK (refund_amount > 0),
    commission_reversal numeric(18,0) NOT NULL CHECK (commission_reversal >= 0),
    commission_rate numeric(8,6) NOT NULL CHECK (commission_rate >= 0 AND commission_rate < 1),
    commission_version varchar(40) NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transport_cash_refunds_shift ON transport_cash_refund_adjustments(shift_id);
DROP TRIGGER IF EXISTS transport_cash_refund_adjustments_immutable ON transport_cash_refund_adjustments;
CREATE TRIGGER transport_cash_refund_adjustments_immutable BEFORE UPDATE OR DELETE ON transport_cash_refund_adjustments
    FOR EACH ROW EXECUTE FUNCTION reject_transport_cash_settlement_change();

CREATE TABLE IF NOT EXISTS transport_cash_commission_payments (
    id uuid PRIMARY KEY,
    shift_id uuid NOT NULL UNIQUE REFERENCES transport_cash_settlements(shift_id),
    amount numeric(18,0) NOT NULL CHECK (amount >= 0),
    reference varchar(160) NOT NULL UNIQUE,
    evidence_url varchar(1000) NOT NULL,
    recorded_by uuid NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS transport_cash_commission_payments_immutable ON transport_cash_commission_payments;
CREATE TRIGGER transport_cash_commission_payments_immutable BEFORE UPDATE OR DELETE ON transport_cash_commission_payments
    FOR EACH ROW EXECUTE FUNCTION reject_transport_cash_settlement_change();
