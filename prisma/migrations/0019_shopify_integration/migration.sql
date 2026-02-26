-- AlterTable
ALTER TABLE "User" ADD COLUMN "shopifyShopDomain" TEXT;
ALTER TABLE "User" ADD COLUMN "shopifyAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN "shopifyConnectedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "shopifyLastSyncAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "shopifyAutoCreateJobs" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "shopifyWebhookId" TEXT;
