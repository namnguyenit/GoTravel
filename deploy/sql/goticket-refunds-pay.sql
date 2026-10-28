CREATE TABLE IF NOT EXISTS transport_operation_refund_sources (
 operation_id UUID NOT NULL,
 lot_id UUID NOT NULL,
 payment_order_id UUID,
 method VARCHAR(16) NOT NULL,
 amount NUMERIC(19,0) NOT NULL CHECK (amount > 0),
 PRIMARY KEY(operation_id,lot_id)
);
CREATE TABLE IF NOT EXISTS transport_provider_refund_jobs (
 operation_id UUID PRIMARY KEY,
 order_id UUID NOT NULL,
 actor_id UUID NOT NULL,
 amount NUMERIC(19,0) NOT NULL CHECK (amount > 0),
 state VARCHAR(32) NOT NULL DEFAULT 'PREPARED',
 message VARCHAR(1000),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS transport_provider_refund_legs (
 id UUID PRIMARY KEY,
 operation_id UUID NOT NULL REFERENCES transport_provider_refund_jobs(operation_id),
 payment_id UUID NOT NULL REFERENCES payment_requests(id),
 amount NUMERIC(19,0) NOT NULL CHECK (amount > 0),
 provider VARCHAR(16) NOT NULL,
 request_id VARCHAR(32) NOT NULL UNIQUE,
 state VARCHAR(32) NOT NULL DEFAULT 'PREPARED',
 provider_ref VARCHAR(100),
 request_json TEXT,
 response_json TEXT,
 message VARCHAR(1000),
 submitted_at TIMESTAMP,
 lease_until TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(operation_id,payment_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS transport_provider_ref_unique ON transport_provider_refund_legs(provider,provider_ref) WHERE provider_ref IS NOT NULL AND state='SUCCEEDED';
