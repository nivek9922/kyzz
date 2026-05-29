-- CreateEnum
CREATE TYPE "ReturnType" AS ENUM ('EXCHANGE', 'REFUND');

-- AlterTable
ALTER TABLE "ReturnRequest" ADD COLUMN     "proofImageUrl" TEXT,
ADD COLUMN     "refundAmount" DOUBLE PRECISION,
ADD COLUMN     "refundMethod" TEXT,
ADD COLUMN     "returnType" "ReturnType";
