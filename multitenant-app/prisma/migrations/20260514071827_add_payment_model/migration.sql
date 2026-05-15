-- Session 1 (2026-05-13) used `prisma db push --accept-data-loss` which brought the DB
-- to the current schema.prisma state but did not record the changes as a migration.
-- This file baselines those changes so future `prisma migrate deploy` runs start from
-- the correct point. The DB is already at this state — do NOT re-run this SQL.

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('RENT', 'DEPOSIT', 'FEE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_unitId_fkey";

-- DropIndex
DROP INDEX "Payment_landlordId_category_idx";

-- DropIndex
DROP INDEX "Payment_unitId_idx";

-- AlterTable
ALTER TABLE "Landlord" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "previousSubdomain" TEXT,
ADD COLUMN     "subdomainChangedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "category",
DROP COLUMN "metadata",
DROP COLUMN "stripePaymentIntent",
DROP COLUMN "stripeSubscriptionId",
DROP COLUMN "unitId",
ADD COLUMN     "applicationId" TEXT,
ADD COLUMN     "leaseId" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "stripePaymentIntentId" TEXT,
ALTER COLUMN "tenantId" DROP NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "PaymentType" NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE INTEGER,
DROP COLUMN "status",
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Payment_landlordId_status_idx" ON "Payment"("landlordId", "status");

-- CreateIndex
CREATE INDEX "Payment_landlordId_type_idx" ON "Payment"("landlordId", "type");

-- CreateIndex
CREATE INDEX "Payment_applicationId_idx" ON "Payment"("applicationId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
