-- Apply only during the later validation/release stage.
ALTER TABLE trips ADD COLUMN inventory_sync_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE trips ADD COLUMN inventory_synced_version INTEGER NOT NULL DEFAULT 0;
UPDATE trips SET inventory_sync_version=1 WHERE offer_listing_id IS NOT NULL;
ALTER TABLE trips ADD COLUMN search_price_vnd NUMERIC(18,0);
UPDATE trips SET search_price_vnd=COALESCE(price_vnd,price_per_seat::numeric);
