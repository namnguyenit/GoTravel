CREATE TABLE IF NOT EXISTS "trip_cancellations" (
  "trip_id" TEXT NOT NULL PRIMARY KEY REFERENCES "trips"("id") ON DELETE RESTRICT,
  "requested_by" TEXT NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PROCESSING',
  "pending_orders" INTEGER NOT NULL DEFAULT 0,
  "pending_refunds" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trip_cancellations_status_check" CHECK ("status" IN ('PROCESSING', 'REFUND_PENDING', 'COMPLETED'))
);

CREATE OR REPLACE FUNCTION protect_cancelling_trip_status() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."status" NOT IN ('STOP_SALE', 'CANCELLED') AND EXISTS (
    SELECT 1 FROM "trip_cancellations" WHERE "trip_id" = NEW."id"
  ) THEN
    RAISE EXCEPTION 'Trip cancellation is in progress';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trips_cancellation_status_guard ON "trips";
CREATE TRIGGER trips_cancellation_status_guard BEFORE UPDATE OF "status" ON "trips"
  FOR EACH ROW EXECUTE FUNCTION protect_cancelling_trip_status();
