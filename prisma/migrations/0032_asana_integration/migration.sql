-- AlterTable: Add Asana OAuth fields to User model
ALTER TABLE "User" ADD COLUMN "asanaAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN "asanaRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN "asanaTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "asanaConnectedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "asanaWorkspaceGid" TEXT;
ALTER TABLE "User" ADD COLUMN "asanaWorkspaceName" TEXT;
ALTER TABLE "User" ADD COLUMN "asanaProjectGid" TEXT;
ALTER TABLE "User" ADD COLUMN "asanaProjectName" TEXT;
ALTER TABLE "User" ADD COLUMN "asanaAutoCreateTasks" BOOLEAN NOT NULL DEFAULT false;
