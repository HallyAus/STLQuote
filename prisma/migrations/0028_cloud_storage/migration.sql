-- Cloud Storage: CloudConnection + CloudSyncRecord + DesignFile cloud fields

-- CloudConnection: stores encrypted OAuth tokens per provider per user
CREATE TABLE "CloudConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "providerEmail" TEXT,
    "rootFolderId" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" TIMESTAMP(3),
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CloudConnection_pkey" PRIMARY KEY ("id")
);

-- CloudSyncRecord: tracks file sync state between local and cloud
CREATE TABLE "CloudSyncRecord" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "localFileType" TEXT NOT NULL,
    "localFileId" TEXT NOT NULL,
    "cloudFileId" TEXT NOT NULL,
    "cloudFileName" TEXT NOT NULL,
    "cloudFolderPath" TEXT,
    "direction" TEXT NOT NULL,
    "localModifiedAt" TIMESTAMP(3),
    "cloudModifiedAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloudSyncRecord_pkey" PRIMARY KEY ("id")
);

-- DesignFile: add cloud reference fields
ALTER TABLE "DesignFile" ADD COLUMN "cloudFileId" TEXT;
ALTER TABLE "DesignFile" ADD COLUMN "cloudProvider" TEXT;

-- Indexes
CREATE INDEX "CloudConnection_userId_idx" ON "CloudConnection"("userId");
CREATE UNIQUE INDEX "CloudConnection_userId_provider_key" ON "CloudConnection"("userId", "provider");

CREATE INDEX "CloudSyncRecord_connectionId_idx" ON "CloudSyncRecord"("connectionId");
CREATE UNIQUE INDEX "CloudSyncRecord_connectionId_localFileType_localFileId_key" ON "CloudSyncRecord"("connectionId", "localFileType", "localFileId");

-- Foreign keys
ALTER TABLE "CloudConnection" ADD CONSTRAINT "CloudConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CloudSyncRecord" ADD CONSTRAINT "CloudSyncRecord_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "CloudConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
