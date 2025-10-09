-- Ajouter les tables pour les campagnes newsletter

CREATE TABLE "NewsletterCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalOpened" INTEGER NOT NULL DEFAULT 0,
    "totalClicked" INTEGER NOT NULL DEFAULT 0,
    "totalBounced" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NewsletterCampaignSend" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterCampaignSend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsletterCampaignSend_campaignId_subscriberId_key" ON "NewsletterCampaignSend"("campaignId", "subscriberId");

CREATE INDEX "NewsletterCampaign_status_idx" ON "NewsletterCampaign"("status");
CREATE INDEX "NewsletterCampaign_createdAt_idx" ON "NewsletterCampaign"("createdAt");
CREATE INDEX "NewsletterCampaignSend_campaignId_idx" ON "NewsletterCampaignSend"("campaignId");
CREATE INDEX "NewsletterCampaignSend_subscriberId_idx" ON "NewsletterCampaignSend"("subscriberId");
CREATE INDEX "NewsletterCampaignSend_status_idx" ON "NewsletterCampaignSend"("status");

ADD CONSTRAINT "NewsletterCampaignSend_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NewsletterCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ADD CONSTRAINT "NewsletterCampaignSend_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;