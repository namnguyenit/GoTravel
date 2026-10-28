ALTER TABLE transport_cash_shifts ADD COLUMN IF NOT EXISTS auto_managed boolean NOT NULL DEFAULT false;
-- Open records become internal accounting batches. Closed physical-count history stays intact.
UPDATE transport_cash_shifts SET auto_managed=true WHERE closed_at IS NULL AND auto_managed=false;
CREATE INDEX IF NOT EXISTS idx_transport_cash_auto_close ON transport_cash_shifts(opened_at) WHERE auto_managed=true AND closed_at IS NULL;
