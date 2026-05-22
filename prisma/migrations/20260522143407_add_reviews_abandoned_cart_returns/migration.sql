-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(600),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbandonedCart" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "recoveryToken" TEXT NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbandonedCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" VARCHAR(1000),
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "Review"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_productId_key" ON "Review"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "AbandonedCart_recoveryToken_key" ON "AbandonedCart"("recoveryToken");

-- CreateIndex
CREATE INDEX "AbandonedCart_email_idx" ON "AbandonedCart"("email");

-- CreateIndex
CREATE INDEX "AbandonedCart_createdAt_idx" ON "AbandonedCart"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_orderId_key" ON "ReturnRequest"("orderId");

-- CreateIndex
CREATE INDEX "ReturnRequest_status_idx" ON "ReturnRequest"("status");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
