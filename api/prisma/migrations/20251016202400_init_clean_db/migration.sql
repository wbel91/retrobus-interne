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
-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED', 'RESERVED');

-- CreateEnum
CREATE TYPE "StockCategory" AS ENUM ('PIECES_DETACHEES', 'CONSOMMABLES', 'OUTILLAGE', 'EQUIPEMENT', 'DOCUMENTATION', 'MERCHANDISING', 'FOURNITURES', 'SECURITE', 'GENERAL');

-- CreateEnum
CREATE TYPE "StockUnit" AS ENUM ('PIECE', 'KG', 'LITRE', 'METRE', 'PAQUET', 'BOITE', 'ROULEAU', 'SET', 'AUTRE');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- DropForeignKey
ALTER TABLE "MemberDocument" DROP CONSTRAINT "MemberDocument_memberId_fkey";

-- DropForeignKey
ALTER TABLE "NewsletterCampaignSend" DROP CONSTRAINT "NewsletterCampaignSend_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "NewsletterCampaignSend" DROP CONSTRAINT "NewsletterCampaignSend_subscriberId_fkey";

-- DropForeignKey
ALTER TABLE "PasswordReset" DROP CONSTRAINT "PasswordReset_memberId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_parc_fkey";

-- DropForeignKey
ALTER TABLE "Usage" DROP CONSTRAINT "Usage_parc_fkey";

-- DropIndex
DROP INDEX "Event_date_idx";

-- DropIndex
DROP INDEX "EventRegistration_helloAssoOrderId_idx";

-- DropIndex
DROP INDEX "Member_email_idx";

-- DropIndex
DROP INDEX "Member_licenseExpiryDate_idx";

-- DropIndex
DROP INDEX "Member_memberNumber_idx";

-- DropIndex
DROP INDEX "Member_membershipStatus_idx";

-- DropIndex
DROP INDEX "Member_renewalDate_idx";

-- DropIndex
DROP INDEX "Member_role_idx";

-- DropIndex
DROP INDEX "NewsletterCampaign_createdAt_idx";

-- DropIndex
DROP INDEX "NewsletterCampaign_status_idx";

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "EventRegistration" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ALTER COLUMN "helloAssoStatus" SET NOT NULL,
ALTER COLUMN "helloAssoStatus" SET DEFAULT 'PENDING',
ALTER COLUMN "adultTickets" SET DEFAULT 1,
ALTER COLUMN "totalAmount" SET NOT NULL,
ALTER COLUMN "paymentMethod" SET DEFAULT 'helloasso';

-- AlterTable
ALTER TABLE "Flash" DROP CONSTRAINT "Flash_pkey",
DROP COLUMN "category",
DROP COLUMN "message",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'info',
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Flash_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "renewalDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "NewsletterCampaign" DROP COLUMN "totalBounced",
DROP COLUMN "totalClicked",
DROP COLUMN "totalOpened",
DROP COLUMN "totalSent",
ADD COLUMN     "failureCount" INTEGER,
ADD COLUMN     "recipientCount" INTEGER,
ADD COLUMN     "successCount" INTEGER;

-- AlterTable
ALTER TABLE "Usage" ALTER COLUMN "relatedTo" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "MemberDocument";

-- DropTable
DROP TABLE "NewsletterCampaignSend";

-- DropTable
DROP TABLE "PasswordReset";

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
CREATE TABLE "Stock" (
    "id" SERIAL NOT NULL,
    "reference" TEXT,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "StockCategory" NOT NULL DEFAULT 'GENERAL',
    "subcategory" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 0,
    "unit" "StockUnit" NOT NULL DEFAULT 'PIECE',
    "location" TEXT,
    "supplier" TEXT,
    "purchasePrice" DOUBLE PRECISION,
    "salePrice" DOUBLE PRECISION,
    "status" "StockStatus" NOT NULL DEFAULT 'AVAILABLE',
    "lastRestockDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_memberId_idx" ON "Document"("memberId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Document_expiryDate_idx" ON "Document"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_reference_key" ON "Stock"("reference");

-- CreateIndex
CREATE INDEX "Stock_category_idx" ON "Stock"("category");

-- CreateIndex
CREATE INDEX "Stock_status_idx" ON "Stock"("status");

-- CreateIndex
CREATE INDEX "Stock_quantity_idx" ON "Stock"("quantity");

-- CreateIndex
CREATE INDEX "Stock_name_idx" ON "Stock"("name");

-- CreateIndex
CREATE INDEX "StockMovement_stockId_idx" ON "StockMovement"("stockId");

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

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

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
