-- Drip email tracking: records which onboarding emails have been sent to each user

CREATE TABLE "DripEmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DripEmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DripEmailLog_userId_idx" ON "DripEmailLog"("userId");
CREATE UNIQUE INDEX "DripEmailLog_userId_emailKey_key" ON "DripEmailLog"("userId", "emailKey");

ALTER TABLE "DripEmailLog" ADD CONSTRAINT "DripEmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
