-- AlterTable: add barcode to Material
ALTER TABLE "Material" ADD COLUMN "barcode" TEXT;

-- CreateTable: PrinterLoad (material ↔ printer assignment tracking)
CREATE TABLE "PrinterLoad" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "loadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unloadedAt" TIMESTAMP(3),
    "weightLoadedG" DOUBLE PRECISION,
    "weightUsedG" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "PrinterLoad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrinterLoad_userId_idx" ON "PrinterLoad"("userId");
CREATE INDEX "PrinterLoad_printerId_idx" ON "PrinterLoad"("printerId");
CREATE INDEX "PrinterLoad_materialId_idx" ON "PrinterLoad"("materialId");
CREATE INDEX "PrinterLoad_userId_unloadedAt_idx" ON "PrinterLoad"("userId", "unloadedAt");

-- AddForeignKey
ALTER TABLE "PrinterLoad" ADD CONSTRAINT "PrinterLoad_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrinterLoad" ADD CONSTRAINT "PrinterLoad_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
