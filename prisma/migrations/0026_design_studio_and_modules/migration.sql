-- CreateEnum
CREATE TYPE "DesignStatus" AS ENUM ('IDEA', 'RESEARCH', 'DRAFTING', 'PROTOTYPING', 'PRODUCTION_READY', 'ARCHIVED');

-- CreateTable: UserModule
CREATE TABLE "UserModule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "override" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserModule_userId_feature_key" ON "UserModule"("userId", "feature");
CREATE INDEX "UserModule_userId_idx" ON "UserModule"("userId");

-- CreateTable: Design
CREATE TABLE "Design" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "designNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "DesignStatus" NOT NULL DEFAULT 'IDEA',
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetLengthMm" DOUBLE PRECISION,
    "targetWidthMm" DOUBLE PRECISION,
    "targetHeightMm" DOUBLE PRECISION,
    "targetWeightG" DOUBLE PRECISION,
    "suggestedMaterial" TEXT,
    "suggestedColour" TEXT,
    "suggestedInfill" DOUBLE PRECISION,
    "printNotes" TEXT,
    "feasibilityScore" INTEGER,
    "feasibilityNotes" TEXT,
    "estimatedCost" DOUBLE PRECISION,
    "estimatedTimeMin" DOUBLE PRECISION,
    "clientId" TEXT,
    "quoteId" TEXT,
    "jobId" TEXT,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Design_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Design_userId_designNumber_key" ON "Design"("userId", "designNumber");
CREATE INDEX "Design_userId_idx" ON "Design"("userId");
CREATE INDEX "Design_status_idx" ON "Design"("status");

-- CreateTable: DesignMessage
CREATE TABLE "DesignMessage" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageData" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DesignMessage_designId_idx" ON "DesignMessage"("designId");

-- CreateTable: DesignFile
CREATE TABLE "DesignFile" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "revisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DesignFile_designId_idx" ON "DesignFile"("designId");

-- CreateTable: DesignRevision
CREATE TABLE "DesignRevision" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "changes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DesignRevision_designId_idx" ON "DesignRevision"("designId");

-- AddForeignKey
ALTER TABLE "UserModule" ADD CONSTRAINT "UserModule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Design" ADD CONSTRAINT "Design_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Design" ADD CONSTRAINT "Design_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Design" ADD CONSTRAINT "Design_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Design" ADD CONSTRAINT "Design_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DesignMessage" ADD CONSTRAINT "DesignMessage_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesignFile" ADD CONSTRAINT "DesignFile_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesignFile" ADD CONSTRAINT "DesignFile_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "DesignRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DesignRevision" ADD CONSTRAINT "DesignRevision_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;
