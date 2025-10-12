/*
  Warnings:

  - You are about to drop the column `createdAt` on the `EventRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `EventRegistration` table. All the data in the column will be lost.
  - The primary key for the `Flash` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `category` on the `Flash` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `Flash` table. All the data in the column will be lost.
  - The `id` column on the `Flash` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `totalBounced` on the `NewsletterCampaign` table. All the data in the column will be lost.
  - You are about to drop the column `totalClicked` on the `NewsletterCampaign` table. All the data in the column will be lost.
  - You are about to drop the column `totalOpened` on the `NewsletterCampaign` table. All the data in the column will be lost.
  - You are about to drop the column `totalSent` on the `NewsletterCampaign` table. All the data in the column will be lost.
  - You are about to drop the `MemberDocument` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NewsletterCampaignSend` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PasswordReset` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `helloAssoStatus` on table `EventRegistration` required. This step will fail if there are existing NULL values in that column.
  - Made the column `totalAmount` on table `EventRegistration` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `content` to the `Flash` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MemberDocument" DROP CONSTRAINT IF EXISTS "MemberDocument_memberId_fkey";

-- DropForeignKey
ALTER TABLE "NewsletterCampaignSend" DROP CONSTRAINT IF EXISTS "NewsletterCampaignSend_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "NewsletterCampaignSend" DROP CONSTRAINT IF EXISTS "NewsletterCampaignSend_subscriberId_fkey";

-- DropForeignKey
ALTER TABLE "PasswordReset" DROP CONSTRAINT IF EXISTS "PasswordReset_memberId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_parc_fkey";

-- DropForeignKey
ALTER TABLE "Usage" DROP CONSTRAINT IF EXISTS "Usage_parc_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Event_date_idx";

-- DropIndex
DROP INDEX IF EXISTS "EventRegistration_helloAssoOrderId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Member_email_idx";

-- DropIndex
DROP INDEX IF EXISTS "Member_licenseExpiryDate_idx";

-- DropIndex
DROP INDEX IF EXISTS "Member_memberNumber_idx";

-- DropIndex
DROP INDEX IF EXISTS "Member_membershipStatus_idx";

-- DropIndex
DROP INDEX IF EXISTS "Member_renewalDate_idx";

-- DropIndex
DROP INDEX IF EXISTS "Member_role_idx";

-- DropIndex
DROP INDEX IF EXISTS "NewsletterCampaign_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "NewsletterCampaign_status_idx";

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "EventRegistration" 
  DROP COLUMN IF EXISTS "createdAt",
  DROP COLUMN IF EXISTS "updatedAt",
  ALTER COLUMN "helloAssoStatus" SET NOT NULL,
  ALTER COLUMN "helloAssoStatus" SET DEFAULT 'PENDING',
  ALTER COLUMN "adultTickets" SET DEFAULT 1,
  ALTER COLUMN "totalAmount" SET NOT NULL,
  ALTER COLUMN "paymentMethod" SET DEFAULT 'helloasso';

-- AlterTable
ALTER TABLE "Flash" DROP CONSTRAINT "Flash_pkey",
DROP COLUMN "category",
DROP COLUMN "message",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'info',
ADD CONSTRAINT "Flash_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "renewalDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "NewsletterCampaign" 
  DROP COLUMN IF EXISTS "totalBounced",
  DROP COLUMN IF EXISTS "totalClicked",
  DROP COLUMN IF EXISTS "totalOpened",
  DROP COLUMN IF EXISTS "totalSent",
  ADD COLUMN     "failureCount" INTEGER,
  ADD COLUMN     "recipientCount" INTEGER,
  ADD COLUMN     "successCount" INTEGER;

ALTER TABLE "Usage" ALTER COLUMN "relatedTo" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE IF EXISTS "MemberDocument";

-- DropTable
DROP TABLE IF EXISTS "NewsletterCampaignSend";

-- DropTable
DROP TABLE IF EXISTS "PasswordReset";

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "expiryDate" TIMESTAMP(3),
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Changelog" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Changelog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "maintenanceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceImage" TEXT,
    "maintenanceMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_memberId_idx" ON "Document"("memberId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Document_expiryDate_idx" ON "Document"("expiryDate");

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_parc_fkey" FOREIGN KEY ("parc") REFERENCES "Vehicle"("parc") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_parc_fkey" FOREIGN KEY ("parc") REFERENCES "Vehicle"("parc") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_usageId_fkey" FOREIGN KEY ("usageId") REFERENCES "Usage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("parc") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Safely drop FKs if they exist
ALTER TABLE "MemberDocument"       DROP CONSTRAINT IF EXISTS "MemberDocument_memberId_fkey";
ALTER TABLE "NewsletterCampaignSend" DROP CONSTRAINT IF EXISTS "NewsletterCampaignSend_campaignId_fkey";
ALTER TABLE "NewsletterCampaignSend" DROP CONSTRAINT IF EXISTS "NewsletterCampaignSend_subscriberId_fkey";
ALTER TABLE "PasswordReset"        DROP CONSTRAINT IF EXISTS "PasswordReset_memberId_fkey";
ALTER TABLE "Report"               DROP CONSTRAINT IF EXISTS "Report_parc_fkey";
ALTER TABLE "Usage"                DROP CONSTRAINT IF EXISTS "Usage_parc_fkey";

-- Safely drop indexes if they exist
DROP INDEX IF EXISTS "Event_date_idx";
DROP INDEX IF EXISTS "EventRegistration_helloAssoOrderId_idx";
DROP INDEX IF EXISTS "Member_email_idx";
DROP INDEX IF EXISTS "Member_licenseExpiryDate_idx";
DROP INDEX IF EXISTS "Member_memberNumber_idx";
DROP INDEX IF EXISTS "Member_membershipStatus_idx";
DROP INDEX IF EXISTS "Member_renewalDate_idx";
DROP INDEX IF EXISTS "Member_role_idx";
DROP INDEX IF EXISTS "NewsletterCampaign_createdAt_idx";
DROP INDEX IF EXISTS "NewsletterCampaign_status_idx";

-- Alter tables (guard optional column removals)
ALTER TABLE "Event" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "EventRegistration"
  DROP COLUMN IF EXISTS "createdAt",
  DROP COLUMN IF EXISTS "updatedAt",
  ALTER COLUMN "helloAssoStatus" SET NOT NULL,
  ALTER COLUMN "helloAssoStatus" SET DEFAULT 'PENDING',
  ALTER COLUMN "adultTickets" SET DEFAULT 1,
  ALTER COLUMN "totalAmount" SET NOT NULL,
  ALTER COLUMN "paymentMethod" SET DEFAULT 'helloasso';

-- Flash table changes (Postgres-safe, idempotent via IF EXISTS on drops)
ALTER TABLE "Flash" DROP CONSTRAINT IF EXISTS "Flash_pkey";
ALTER TABLE "Flash" DROP COLUMN IF EXISTS "category";
ALTER TABLE "Flash" DROP COLUMN IF EXISTS "message";

-- Recreate ID column as serial PK and new fields
-- If "id" already existed, we drop it above and add again (consistent state)
ALTER TABLE "Flash" DROP COLUMN IF EXISTS "id";
ALTER TABLE "Flash" ADD COLUMN "id" SERIAL NOT NULL;
ALTER TABLE "Flash" ADD COLUMN "content" TEXT NOT NULL;
ALTER TABLE "Flash" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'info';

-- Re-add PK (no ON CONFLICT; that syntax is for INSERT only)
ALTER TABLE "Flash" ADD CONSTRAINT "Flash_pkey" PRIMARY KEY ("id");

-- Optional: remove default from "type" if you don’t want a permanent default
ALTER TABLE "Flash" ALTER COLUMN "type" DROP DEFAULT;

-- NewsletterCampaign column adjustments (guarded)
ALTER TABLE "NewsletterCampaign"
  DROP COLUMN IF EXISTS "totalBounced",
  DROP COLUMN IF EXISTS "totalClicked",
  DROP COLUMN IF EXISTS "totalOpened",
  DROP COLUMN IF EXISTS "totalSent";

ALTER TABLE "NewsletterCampaign"
  ADD COLUMN IF NOT EXISTS "failureCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "recipientCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "successCount" INTEGER;

-- Type change
ALTER TABLE "Usage" ALTER COLUMN "relatedTo" SET DATA TYPE TEXT;

-- Safely drop old tables if they exist (these may not exist in shadow DB)
DROP TABLE IF EXISTS "MemberDocument";
DROP TABLE IF EXISTS "NewsletterCampaignSend";
DROP TABLE IF EXISTS "PasswordReset";

-- Create new tables (idempotent-ish via checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'Document'
  ) THEN
    CREATE TABLE "Document" (
      "id" TEXT NOT NULL,
      "memberId" TEXT NOT NULL,
      "type" "DocumentType" NOT NULL,
      "fileName" TEXT NOT NULL,
      "filePath" TEXT NOT NULL,
      "fileSize" INTEGER,
      "mimeType" TEXT,
      "expiryDate" TIMESTAMP(3),
      "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
      "reviewedBy" TEXT,
      "reviewedAt" TIMESTAMP(3),
      "reviewNotes" TEXT,
      "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'Changelog'
  ) THEN
    CREATE TABLE "Changelog" (
      "id" SERIAL NOT NULL,
      "title" TEXT NOT NULL,
      "version" TEXT NOT NULL,
      "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "changes" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Changelog_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'SiteSettings'
  ) THEN
    CREATE TABLE "SiteSettings" (
      "id" INTEGER NOT NULL DEFAULT 1,
      "maintenanceEnabled" BOOLEAN NOT NULL DEFAULT false,
      "maintenanceImage" TEXT,
      "maintenanceMessage" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
    );
  END IF;
END $$;

-- Recreate indexes if missing
CREATE INDEX IF NOT EXISTS "Document_memberId_idx" ON "Document"("memberId");
CREATE INDEX IF NOT EXISTS "Document_type_idx"     ON "Document"("type");
CREATE INDEX IF NOT EXISTS "Document_status_idx"   ON "Document"("status");
CREATE INDEX IF NOT EXISTS "Document_expiryDate_idx" ON "Document"("expiryDate");

-- Re-add FKs guarded
ALTER TABLE "Usage"
  ADD CONSTRAINT "Usage_parc_fkey"
  FOREIGN KEY ("parc") REFERENCES "Vehicle"("parc")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_parc_fkey"
  FOREIGN KEY ("parc") REFERENCES "Vehicle"("parc")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_usageId_fkey"
  FOREIGN KEY ("usageId") REFERENCES "Usage"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event"
  ADD CONSTRAINT "Event_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("parc")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventRegistration"
  ADD CONSTRAINT "EventRegistration_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Document"
  ADD CONSTRAINT "Document_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "Member"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
