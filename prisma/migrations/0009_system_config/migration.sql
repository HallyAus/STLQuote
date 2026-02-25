-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- Seed: registration open by default
INSERT INTO "SystemConfig" ("key", "value", "updatedAt") VALUES ('registrationOpen', 'true', NOW());
