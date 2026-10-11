-- Additive migration. Legacy tickets remain for audit; new issued_tickets are
-- commercial fulfillment records keyed by Cart order_item_id.
ALTER TYPE "TripStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "TripStatus" ADD VALUE IF NOT EXISTS 'PUBLISHING';
ALTER TYPE "TripStatus" ADD VALUE IF NOT EXISTS 'ON_SALE';
ALTER TYPE "TripStatus" ADD VALUE IF NOT EXISTS 'STOP_SALE';
ALTER TABLE "trips" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "price_vnd" DECIMAL(18,0);
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "offer_listing_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "operators_user_id_key" ON "operators"("user_id");
CREATE TABLE IF NOT EXISTS "operator_staff" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "operator_id" TEXT NOT NULL REFERENCES "operators"("id") ON DELETE CASCADE,
  "user_id" TEXT NOT NULL,
  "can_sell_cash" BOOLEAN NOT NULL DEFAULT false,
  "can_check_in" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "assigned_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operator_staff_operator_id_user_id_key" UNIQUE ("operator_id", "user_id")
);
UPDATE "trips"
   SET "price_vnd" = ROUND("price_per_seat"::numeric, 0)
 WHERE "price_vnd" IS NULL AND "price_per_seat" > 0;

CREATE TABLE IF NOT EXISTS "seat_templates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "car_id" TEXT NOT NULL REFERENCES "cars"("id") ON DELETE RESTRICT,
  "code" VARCHAR(32) NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "seat_class" VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seat_templates_car_id_code_key" UNIQUE ("car_id", "code")
);

DO $$ BEGIN
  CREATE TYPE "IssuedTicketStatus" AS ENUM ('ACTIVE', 'VOID', 'CHECKED_IN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "issued_tickets" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "order_id" TEXT NOT NULL,
  "order_item_id" TEXT NOT NULL UNIQUE,
  "trip_id" TEXT NOT NULL REFERENCES "trips"("id") ON DELETE RESTRICT,
  "seat_id" TEXT NOT NULL,
  "passenger_name" TEXT NOT NULL,
  "pickup_stop_id" TEXT NOT NULL,
  "dropoff_stop_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL UNIQUE,
  "status" "IssuedTicketStatus" NOT NULL DEFAULT 'ACTIVE',
  "checked_in_at" TIMESTAMP(3),
  "checked_in_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "issued_tickets_trip_id_status_idx" ON "issued_tickets"("trip_id", "status");
CREATE INDEX IF NOT EXISTS "issued_tickets_order_id_idx" ON "issued_tickets"("order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_active_ticket_for_trip_seat"
  ON "issued_tickets"("trip_id", "seat_id")
  WHERE "status" IN ('ACTIVE', 'CHECKED_IN');

-- The application pre-check is only advisory; this constraint closes the
-- concurrent-create race for a vehicle's operating schedule.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "trips" ADD CONSTRAINT "trips_car_schedule_no_overlap"
  EXCLUDE USING gist (
    "car_id" WITH =,
    tsrange("departure_time", "arrival_time", '[)') WITH &&
  ) WHERE ("status" NOT IN ('CANCELLED', 'COMPLETED'));
