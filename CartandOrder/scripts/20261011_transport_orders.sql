-- Apply before deploying the transport-aware Cart build. Existing GoTravel rows keep their values.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_kind varchar(32) NOT NULL DEFAULT 'GOTRAVEL_LISTING';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method varchar(16) NOT NULL DEFAULT 'ONLINE';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_trip_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_hold_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_idempotency_key varchar(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_request_hash varchar(64);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_cashier_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_cash_shift_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_departure_at timestamp;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_policy_version varchar(40);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_full_refund_hours integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_partial_refund_hours integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_partial_fee_rate numeric(8,6);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_cancellation_fee numeric(18,0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_refund_due numeric(18,0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_cancellation_reason varchar(500);
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- Existing installations have Hibernate-generated enum CHECK constraints.
-- Recreate them before any transport order enters a new workflow state.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status::text IN (
    'PENDING', 'PAYMENT_PENDING', 'CASH_PENDING', 'FULFILLMENT_PENDING',
    'CANCELLATION_PENDING', 'PAID_REVIEW', 'CASH_RECEIVED_PENDING_RECONCILIATION',
    'REFUND_PENDING', 'REFUNDED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'
));
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_kind_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_kind_check
    CHECK (order_kind IN ('GOTRAVEL_LISTING', 'GOCAR_TICKET'));
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
    CHECK (payment_method IN ('ONLINE', 'CASH'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_guest_cash_only;
ALTER TABLE orders ADD CONSTRAINT orders_guest_cash_only CHECK (
    user_id IS NOT NULL OR (order_kind = 'GOCAR_TICKET' AND payment_method = 'CASH'
        AND transport_cashier_id IS NOT NULL AND transport_cash_shift_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_transport_user_idempotency
    ON orders(user_id, transport_idempotency_key)
    WHERE transport_idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_transport_cashier_idempotency
    ON orders(transport_cashier_id, transport_idempotency_key)
    WHERE transport_cashier_id IS NOT NULL AND transport_idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS transport_cash_shifts (
    id uuid PRIMARY KEY,
    actor_id uuid NOT NULL,
    operator_id uuid NOT NULL,
    commission_rate numeric(8,6) NOT NULL,
    commission_version varchar(40) NOT NULL,
    opened_at timestamptz NOT NULL DEFAULT now(),
    closed_at timestamptz,
    gross_amount numeric(18,0),
    cash_refund_amount numeric(18,0),
    expected_amount numeric(18,0),
    counted_amount numeric(18,0),
    variance numeric(18,0),
    commission_due numeric(18,0),
    settlement_sent_at timestamptz,
    CONSTRAINT transport_cash_shift_amount CHECK (counted_amount IS NULL OR counted_amount >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_transport_cash_shift
    ON transport_cash_shifts(actor_id) WHERE closed_at IS NULL;

CREATE TABLE IF NOT EXISTS transport_cash_receipts (
    id uuid PRIMARY KEY,
    receipt_no varchar(64) NOT NULL UNIQUE,
    order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
    shift_id uuid NOT NULL REFERENCES transport_cash_shifts(id),
    actor_id uuid NOT NULL,
    operator_id uuid NOT NULL,
    amount numeric(18,0) NOT NULL CHECK (amount > 0),
    currency varchar(3) NOT NULL DEFAULT 'VND',
    received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transport_cash_receipts_shift ON transport_cash_receipts(shift_id);

CREATE OR REPLACE FUNCTION reject_transport_cash_receipt_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Cash receipt journal is append-only';
END;
$$;
DROP TRIGGER IF EXISTS transport_cash_receipts_immutable ON transport_cash_receipts;
CREATE TRIGGER transport_cash_receipts_immutable BEFORE UPDATE OR DELETE ON transport_cash_receipts
    FOR EACH ROW EXECUTE FUNCTION reject_transport_cash_receipt_change();

CREATE TABLE IF NOT EXISTS transport_refund_confirmations (
    id uuid PRIMARY KEY,
    order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
    amount numeric(18,0) NOT NULL CHECK (amount > 0),
    reference varchar(160) NOT NULL UNIQUE,
    evidence_url varchar(1000) NOT NULL,
    payment_method varchar(16) NOT NULL,
    recorded_by uuid NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION reject_transport_refund_confirmation_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Refund confirmation is append-only';
END;
$$;
DROP TRIGGER IF EXISTS transport_refund_confirmations_immutable ON transport_refund_confirmations;
CREATE TRIGGER transport_refund_confirmations_immutable BEFORE UPDATE OR DELETE ON transport_refund_confirmations
    FOR EACH ROW EXECUTE FUNCTION reject_transport_refund_confirmation_change();
CREATE TABLE IF NOT EXISTS transport_cash_refund_outbox (
    order_id uuid PRIMARY KEY REFERENCES transport_refund_confirmations(order_id),
    delivered_at timestamptz
);

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS transport_trip_id uuid;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS transport_seat_id uuid;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS transport_seat_code varchar(32);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS passenger_name varchar(255);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS pickup_stop_id uuid;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS dropoff_stop_id uuid;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS transport_ticket_id uuid;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS transport_check_in_token varchar(256);
