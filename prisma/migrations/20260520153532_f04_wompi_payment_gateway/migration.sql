-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('paypal', 'wompi', 'manual');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentGateway" "PaymentGateway";
