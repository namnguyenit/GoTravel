-- Explicit simulation audit, separate from immutable evidence of real transfers.
ALTER TABLE host_payouts ADD COLUMN IF NOT EXISTS settlement_simulated BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS transport_settlement_simulations (
 kind VARCHAR(16) NOT NULL CHECK(kind IN ('PAYOUT','CASH_COMMISSION')),
 target_id UUID NOT NULL, actor_id UUID NOT NULL,
 amount NUMERIC(19,0) NOT NULL CHECK(amount>=0),
 reference VARCHAR(160) NOT NULL UNIQUE, evidence_url VARCHAR(1000) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(kind,target_id)
);
