-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('STANDARD', 'FAMILY', 'STUDENT', 'HONORARY', 'LIFETIME');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "participantEmail" TEXT NOT NULL,
    "helloAssoOrderId" TEXT,
    "helloAssoStatus" TEXT,
    "adultTickets" INTEGER NOT NULL DEFAULT 0,
    "childTickets" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION,
    "paymentMethod" TEXT NOT NULL,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketSent" BOOLEAN NOT NULL DEFAULT false,
    "qrCodeData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "memberNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "birthDate" TIMESTAMP(3),
    "membershipType" "MembershipType" NOT NULL DEFAULT 'STANDARD',
    "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewalDate" TIMESTAMP(3) NOT NULL,
    "lastPaymentDate" TIMESTAMP(3),
    "paymentAmount" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "hasExternalAccess" BOOLEAN NOT NULL DEFAULT false,
    "hasInternalAccess" BOOLEAN NOT NULL DEFAULT false,
    "internalPassword" TEXT,
    "newsletter" BOOLEAN NOT NULL DEFAULT true,
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_idx" ON "EventRegistration"("eventId");

-- CreateIndex
CREATE INDEX "EventRegistration_participantEmail_idx" ON "EventRegistration"("participantEmail");

-- CreateIndex
CREATE INDEX "EventRegistration_helloAssoOrderId_idx" ON "EventRegistration"("helloAssoOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_memberNumber_key" ON "Member"("memberNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- CreateIndex
CREATE INDEX "Member_memberNumber_idx" ON "Member"("memberNumber");

-- CreateIndex
CREATE INDEX "Member_email_idx" ON "Member"("email");

-- CreateIndex
CREATE INDEX "Member_membershipStatus_idx" ON "Member"("membershipStatus");

-- CreateIndex
CREATE INDEX "Member_renewalDate_idx" ON "Member"("renewalDate");
