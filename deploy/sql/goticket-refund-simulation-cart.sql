ALTER TABLE transport_automatic_refund_requests
 ADD COLUMN IF NOT EXISTS execution_mode VARCHAR(16) NOT NULL DEFAULT 'PROVIDER'
 CHECK(execution_mode IN ('PROVIDER','SIMULATION'));
