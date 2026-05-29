-- CreateEnum
CREATE TYPE "Carrier" AS ENUM ('heka', 'mipaquete', 'interrapidisimo', 'servientrega', 'coordinadora', 'tcc', 'mensajeros_urbanos', 'noventa_y_nueve', 'manual');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_attempt', 'returned', 'cancelled');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingCost" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "OrderAddress" ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "UserAddress" ADD COLUMN     "state" TEXT;

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "carrier" "Carrier" NOT NULL DEFAULT 'manual',
    "providerRef" TEXT,
    "trackingCode" TEXT,
    "labelUrl" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'created',
    "cost" DOUBLE PRECISION,
    "codAmount" DOUBLE PRECISION,
    "codCollected" BOOLEAN NOT NULL DEFAULT false,
    "codSettledAt" TIMESTAMP(3),
    "estimatedDelivery" TIMESTAMP(3),
    "pickupAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_orderId_key" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX "Shipment_carrier_idx" ON "Shipment"("carrier");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_providerRef_idx" ON "Shipment"("providerRef");

-- CreateIndex
CREATE INDEX "TrackingEvent_shipmentId_idx" ON "TrackingEvent"("shipmentId");

-- CreateIndex
CREATE INDEX "TrackingEvent_occurredAt_idx" ON "TrackingEvent"("occurredAt");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
