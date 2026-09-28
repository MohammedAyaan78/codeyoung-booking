-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable: Booking — add email delivery tracking columns
ALTER TABLE "Booking"
  ADD COLUMN "parentEmailStatus" "EmailStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "mentorEmailStatus" "EmailStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "parentEmailSentAt" TIMESTAMP(3),
  ADD COLUMN "mentorEmailSentAt" TIMESTAMP(3);
