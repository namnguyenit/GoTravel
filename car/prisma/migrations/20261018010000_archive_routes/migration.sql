-- Keep routes and stops referenced by existing trips/tickets.
ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "routes_operator_id_deleted_at_idx" ON "routes"("operator_id", "deleted_at");
