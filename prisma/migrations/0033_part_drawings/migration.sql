-- CreateTable
CREATE TABLE "PartDrawing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "drawingNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "sourceFilename" TEXT NOT NULL,
    "sourceFileId" TEXT,
    "dimensionX" DOUBLE PRECISION NOT NULL,
    "dimensionY" DOUBLE PRECISION NOT NULL,
    "dimensionZ" DOUBLE PRECISION NOT NULL,
    "volumeCm3" DOUBLE PRECISION NOT NULL,
    "triangleCount" INTEGER NOT NULL,
    "viewFront" TEXT NOT NULL,
    "viewSide" TEXT NOT NULL,
    "viewTop" TEXT NOT NULL,
    "viewIso" TEXT NOT NULL,
    "quoteId" TEXT,
    "designId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartDrawing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartDrawing_userId_idx" ON "PartDrawing"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartDrawing_userId_drawingNumber_key" ON "PartDrawing"("userId", "drawingNumber");

-- AddForeignKey
ALTER TABLE "PartDrawing" ADD CONSTRAINT "PartDrawing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartDrawing" ADD CONSTRAINT "PartDrawing_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartDrawing" ADD CONSTRAINT "PartDrawing_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE SET NULL ON UPDATE CASCADE;
