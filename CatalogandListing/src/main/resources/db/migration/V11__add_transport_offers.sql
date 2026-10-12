ALTER TABLE listings ADD COLUMN IF NOT EXISTS transport_operator_id uuid;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS transport_route_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS uq_listings_transport_route
    ON listings(transport_route_id) WHERE transport_route_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_transport_operator
    ON listings(transport_operator_id) WHERE transport_operator_id IS NOT NULL;

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_category_check;
ALTER TABLE listings ADD CONSTRAINT listings_category_check
    CHECK (category IN ('STAY','EXP','SVC','TRANSPORT'));
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_price_unit_check;
ALTER TABLE listings ADD CONSTRAINT listings_price_unit_check
    CHECK (price_unit IN ('PER_NIGHT','PER_PAX','PER_HOUR','PER_SEAT'));
