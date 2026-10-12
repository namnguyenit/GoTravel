-- AlterTable
ALTER TABLE "issued_tickets" ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE IF NOT EXISTS "transport_ticket_amendments" (
    "command_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_ticket_amendments_pkey" PRIMARY KEY ("command_id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transport_ticket_amendments_ticket_id_idx" ON "transport_ticket_amendments"("ticket_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "transport_ticket_amendments_order_item_id_idx" ON "transport_ticket_amendments"("order_item_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'transport_ticket_amendments_ticket_id_fkey'
    ) THEN
        ALTER TABLE "transport_ticket_amendments" ADD CONSTRAINT "transport_ticket_amendments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "issued_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
