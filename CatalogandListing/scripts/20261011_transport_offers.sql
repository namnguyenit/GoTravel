-- Run before deploying Catalog build containing TransportOfferService.
-- Existing STAY/EXP/SVC rows are unaffected.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS transport_operator_id uuid;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS transport_route_id uuid;

-- The original database protects enum values with CHECK constraints created by
-- Hibernate. The Java enums alone do not update those existing constraints.
-- Recreate them before the application writes TRANSPORT/PER_SEAT rows.
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_category_check;
ALTER TABLE listings ADD CONSTRAINT listings_category_check
    CHECK (category IS NULL OR category::text IN ('STAY', 'EXP', 'SVC', 'TRANSPORT'));

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_price_unit_check;
ALTER TABLE listings ADD CONSTRAINT listings_price_unit_check
    CHECK (price_unit IS NULL OR price_unit::text IN ('PER_NIGHT', 'PER_PAX', 'PER_HOUR', 'PER_SEAT'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_transport_offer_route
    ON listings(transport_route_id) WHERE transport_route_id IS NOT NULL;
