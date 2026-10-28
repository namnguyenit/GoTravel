CREATE TABLE IF NOT EXISTS transport_order_refund_simulations (
 order_id UUID PRIMARY KEY, payment_id UUID NOT NULL REFERENCES payment_requests(id), actor_id UUID NOT NULL,
 amount NUMERIC(19,0) NOT NULL CHECK(amount>0), provider VARCHAR(24) NOT NULL,
 reference VARCHAR(160) NOT NULL UNIQUE, evidence_url VARCHAR(1000) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
