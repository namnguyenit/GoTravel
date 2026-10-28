CREATE TABLE IF NOT EXISTS transport_provider_refund_simulations (
 operation_id UUID PRIMARY KEY REFERENCES transport_provider_refund_jobs(operation_id),
 actor_id UUID NOT NULL,
 amount NUMERIC(19,0) NOT NULL CHECK(amount>0),
 environment VARCHAR(16) NOT NULL DEFAULT 'SANDBOX' CHECK(environment='SANDBOX'),
 provider_snapshot TEXT NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
