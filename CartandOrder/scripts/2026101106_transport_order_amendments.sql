-- Add ticket revision to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS transport_ticket_revision INTEGER NOT NULL DEFAULT 1;

-- Create transport_order_amendments table for coordinating amendments
CREATE TABLE IF NOT EXISTS transport_order_amendments (
    command_id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
    actor_id UUID NOT NULL,
    expected_revision INTEGER NOT NULL,
    new_revision INTEGER,
    passenger_name VARCHAR(255) NOT NULL,
    pickup_stop_id UUID NOT NULL,
    dropoff_stop_id UUID NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    error_reason VARCHAR(500),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    applied_at TIMESTAMP WITHOUT TIME ZONE,
    last_retry_at TIMESTAMP WITHOUT TIME ZONE,
    retry_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_transport_amendments_order_id ON transport_order_amendments(order_id);
CREATE INDEX IF NOT EXISTS idx_transport_amendments_item_id ON transport_order_amendments(order_item_id);
CREATE INDEX IF NOT EXISTS idx_transport_amendments_status ON transport_order_amendments(status);
