-- Subscription fields on User
ALTER TABLE "User" ADD COLUMN "subscriptionTier" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "User" ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'trialing';
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "subscriptionEndsAt" TIMESTAMP(3);

-- Xero OAuth tokens (per user)
ALTER TABLE "User" ADD COLUMN "xeroTenantId" TEXT;
ALTER TABLE "User" ADD COLUMN "xeroAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN "xeroRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN "xeroTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "xeroConnectedAt" TIMESTAMP(3);

-- Unique indexes for Stripe IDs
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

-- Subscription event log
CREATE TABLE "SubscriptionEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubscriptionEvent_userId_idx" ON "SubscriptionEvent"("userId");

ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Waitlist
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Waitlist_email_key" ON "Waitlist"("email");
CREATE INDEX "Waitlist_status_idx" ON "Waitlist"("status");

-- Bank details for invoices
ALTER TABLE "Settings" ADD COLUMN "bankName" TEXT;
ALTER TABLE "Settings" ADD COLUMN "bankBsb" TEXT;
ALTER TABLE "Settings" ADD COLUMN "bankAccountNumber" TEXT;
ALTER TABLE "Settings" ADD COLUMN "bankAccountName" TEXT;
ALTER TABLE "Settings" ADD COLUMN "stripeConnectAccountId" TEXT;
