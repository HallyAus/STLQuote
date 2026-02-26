-- AlterTable
ALTER TABLE "Job" ADD COLUMN "scheduledStart" TIMESTAMP(3),
ADD COLUMN "scheduledEnd" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "QuoteTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "lineItems" TEXT,
    "markupPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "terms" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteTemplate_userId_idx" ON "QuoteTemplate"("userId");

-- AddForeignKey
ALTER TABLE "QuoteTemplate" ADD CONSTRAINT "QuoteTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
