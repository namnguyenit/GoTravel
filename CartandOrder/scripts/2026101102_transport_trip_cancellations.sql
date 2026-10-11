CREATE TABLE IF NOT EXISTS transport_trip_cancellations (
    trip_id uuid PRIMARY KEY,
    reason varchar(500) NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'PROCESSING'
        CHECK (status IN ('PROCESSING', 'REFUND_PENDING', 'COMPLETED')),
    pending_orders integer NOT NULL DEFAULT 0,
    pending_refunds integer NOT NULL DEFAULT 0,
    last_error varchar(1000),
    requested_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transport_exchange_cases (
    old_order_id uuid PRIMARY KEY REFERENCES orders(id),
    new_order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
    requested_by uuid NOT NULL,
    reason varchar(500) NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'PROCESSING'
        CHECK (status IN ('PROCESSING', 'REFUND_PENDING', 'COMPLETED')),
    last_error varchar(1000),
    requested_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT transport_exchange_distinct_orders CHECK (old_order_id <> new_order_id)
);
