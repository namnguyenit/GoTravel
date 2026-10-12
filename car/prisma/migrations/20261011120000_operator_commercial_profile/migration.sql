-- CreateEnum
CREATE TYPE "OperatorStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "status" "OperatorStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "display_name" TEXT;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "contact_phone" TEXT;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "contact_address" TEXT;
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "description" TEXT;
