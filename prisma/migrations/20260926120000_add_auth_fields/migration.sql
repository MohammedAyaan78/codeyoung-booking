-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PARENT', 'MENTOR');

-- AlterTable: Mentor — add role and passwordHash
ALTER TABLE "Mentor"
  ADD COLUMN "role"         "Role"   NOT NULL DEFAULT 'MENTOR',
  ADD COLUMN "passwordHash" TEXT;

-- AlterTable: Parent — add role, googleId, profileImageUrl, default phone/timezone
ALTER TABLE "Parent"
  ADD COLUMN "role"            "Role"   NOT NULL DEFAULT 'PARENT',
  ADD COLUMN "googleId"        TEXT,
  ADD COLUMN "profileImageUrl" TEXT;

-- Parent.phone may be empty string (not null) — ensure default
ALTER TABLE "Parent"
  ALTER COLUMN "phone"     SET DEFAULT '',
  ALTER COLUMN "timezone"  SET DEFAULT 'UTC';

-- CreateIndex
CREATE UNIQUE INDEX "Parent_googleId_key" ON "Parent"("googleId");
CREATE INDEX "Parent_googleId_idx" ON "Parent"("googleId");
CREATE INDEX "Booking_parentId_idx" ON "Booking"("parentId");
