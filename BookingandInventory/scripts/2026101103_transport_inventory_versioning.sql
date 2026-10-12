-- Migration: Add sync_version to transport_trip_inventory to track sale state synchronization version
ALTER TABLE transport_trip_inventory ADD COLUMN IF NOT EXISTS sync_version integer NOT NULL DEFAULT 0;
