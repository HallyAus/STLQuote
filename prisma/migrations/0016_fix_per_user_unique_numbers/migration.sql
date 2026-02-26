-- DropIndex
DROP INDEX IF EXISTS "Quote_quoteNumber_key";

-- DropIndex
DROP INDEX IF EXISTS "Invoice_invoiceNumber_key";

-- CreateIndex (per-user unique quote numbers)
CREATE UNIQUE INDEX "Quote_userId_quoteNumber_key" ON "Quote"("userId", "quoteNumber");

-- CreateIndex (per-user unique invoice numbers)
CREATE UNIQUE INDEX "Invoice_userId_invoiceNumber_key" ON "Invoice"("userId", "invoiceNumber");
