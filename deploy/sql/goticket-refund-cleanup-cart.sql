ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_refund_simulated BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE transport_refund_confirmations ADD COLUMN IF NOT EXISTS simulated BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS transport_order_refund_requests (
 order_id UUID PRIMARY KEY REFERENCES orders(id), actor_id UUID NOT NULL,
 amount NUMERIC(19,0) NOT NULL CHECK(amount>0), state VARCHAR(24) NOT NULL DEFAULT 'REQUESTED',
 message VARCHAR(500), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
UPDATE orders o SET transport_refund_simulated=TRUE WHERE EXISTS
 (SELECT 1 FROM transport_item_operations op JOIN transport_operation_refund_proofs p ON p.operation_id=op.id
 WHERE op.order_id=o.id AND p.refund_method='SIMULATED');
