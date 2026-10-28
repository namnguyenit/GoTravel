CREATE TABLE IF NOT EXISTS transport_item_operation_reasons (
 operation_id UUID PRIMARY KEY REFERENCES transport_item_operations(id),
 actor_id UUID NOT NULL,
 reason_code VARCHAR(40) NOT NULL,
 reason_text VARCHAR(1000),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS transport_automatic_refund_requests (
 operation_id UUID PRIMARY KEY REFERENCES transport_item_operations(id),
 actor_id UUID NOT NULL,
 amount NUMERIC(19,0) NOT NULL CHECK (amount > 0),
 state VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
 provider VARCHAR(40),
 message VARCHAR(1000),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS transport_auto_refund_pending_idx ON transport_automatic_refund_requests(state,updated_at);

CREATE INDEX IF NOT EXISTS transport_item_refund_orders_idx ON transport_item_operations(order_id,state);
