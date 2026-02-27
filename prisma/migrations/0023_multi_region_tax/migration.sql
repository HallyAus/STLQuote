-- AlterTable: Settings — add tax region fields
ALTER TABLE "Settings" ADD COLUMN "taxRegion" TEXT NOT NULL DEFAULT 'AU';
ALTER TABLE "Settings" ADD COLUMN "taxSubRegion" TEXT;
ALTER TABLE "Settings" ADD COLUMN "defaultTaxPct" DOUBLE PRECISION NOT NULL DEFAULT 10;
ALTER TABLE "Settings" ADD COLUMN "taxLabel" TEXT NOT NULL DEFAULT 'GST';
ALTER TABLE "Settings" ADD COLUMN "taxIdNumber" TEXT;
ALTER TABLE "Settings" ADD COLUMN "taxInclusive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN "showTaxOnQuotes" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Quote — add tax fields
ALTER TABLE "Quote" ADD COLUMN "taxPct" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN "taxLabel" TEXT NOT NULL DEFAULT 'GST';
ALTER TABLE "Quote" ADD COLUMN "tax" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN "taxInclusive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Invoice — add taxLabel and taxInclusive
ALTER TABLE "Invoice" ADD COLUMN "taxLabel" TEXT NOT NULL DEFAULT 'GST';
ALTER TABLE "Invoice" ADD COLUMN "taxInclusive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Client — add country, stateProvince, taxExempt, taxIdNumber
ALTER TABLE "Client" ADD COLUMN "country" TEXT;
ALTER TABLE "Client" ADD COLUMN "stateProvince" TEXT;
ALTER TABLE "Client" ADD COLUMN "taxExempt" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN "taxIdNumber" TEXT;

-- AlterTable: QuoteTemplate — add tax fields
ALTER TABLE "QuoteTemplate" ADD COLUMN "taxPct" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "QuoteTemplate" ADD COLUMN "taxLabel" TEXT NOT NULL DEFAULT 'GST';
