-- CreateTable
CREATE TABLE IF NOT EXISTS "operator_stops" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operator_stops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "operator_stops_operator_id_active_idx" ON "operator_stops"("operator_id", "active");

-- AddForeignKey
ALTER TABLE "operator_stops" ADD CONSTRAINT "operator_stops_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable route_stops
ALTER TABLE "route_stops" ADD COLUMN IF NOT EXISTS "operator_stop_id" TEXT;
ALTER TABLE "route_stops" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "route_stops" ADD COLUMN IF NOT EXISTS "province" TEXT;

-- AlterTable trips
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "stop_overrides" JSONB;

-- AddForeignKey to route_stops
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'route_stops_operator_stop_id_fkey'
    ) THEN
        ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_operator_stop_id_fkey" FOREIGN KEY ("operator_stop_id") REFERENCES "operator_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
