ALTER TABLE transport_provider_refund_legs ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS transport_provider_refund_schedule_idx ON transport_provider_refund_legs(state,next_attempt_at);
CREATE TABLE IF NOT EXISTS transport_provider_refund_observations (
 id UUID PRIMARY KEY,
 leg_id UUID NOT NULL REFERENCES transport_provider_refund_legs(id),
 kind VARCHAR(32) NOT NULL,
 state VARCHAR(32) NOT NULL,
 message VARCHAR(1000),
 response_json TEXT,
 signature_verified BOOLEAN,
 captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS transport_refund_observations_leg_idx ON transport_provider_refund_observations(leg_id,captured_at);
INSERT INTO transport_provider_refund_observations(id,leg_id,kind,state,message,response_json,captured_at)
 SELECT id,id,'LEGACY_SNAPSHOT',state,message,response_json,updated_at FROM transport_provider_refund_legs WHERE response_json IS NOT NULL
 ON CONFLICT(id) DO NOTHING;
