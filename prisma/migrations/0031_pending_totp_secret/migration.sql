-- AlterTable: Add pendingTotpSecret for server-side 2FA setup flow
ALTER TABLE "User" ADD COLUMN "pendingTotpSecret" TEXT;
