-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('web', 'whatsapp', 'instagram', 'other');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('prepaid', 'cod');

-- AlterEnum
ALTER TYPE "PaymentGateway" ADD VALUE 'cash';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "channel" "SalesChannel" NOT NULL DEFAULT 'web',
ADD COLUMN     "codConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'prepaid',
ADD COLUMN     "reservationExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "reserved" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Order_channel_idx" ON "Order"("channel");

-- CreateIndex
CREATE INDEX "Order_paymentMethod_idx" ON "Order"("paymentMethod");

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill al modelo de stock reservado.
-- El modelo viejo descontaba `stock` al CREAR la orden. Para órdenes activas
-- (pending/processing, no canceladas) la mercancía sigue físicamente en bodega,
-- así que devolvemos su cantidad a `stock` y la marcamos como `reserved`.
-- Resultado: available = stock - reserved se mantiene igual, pero `stock` pasa a
-- representar el inventario físico real (invariante del nuevo modelo).
-- ─────────────────────────────────────────────────────────────────────────────
WITH active_qty AS (
  SELECT oi."variantId" AS vid, SUM(oi.quantity)::int AS qty
  FROM "OrderItem" oi
  JOIN "Order" o ON o.id = oi."orderId"
  WHERE o."cancelledAt" IS NULL
    AND o."shippingStatus" IN ('pending', 'processing')
    AND oi."variantId" IS NOT NULL
  GROUP BY oi."variantId"
)
UPDATE "ProductVariant" v
SET "stock"    = v."stock"    + aq.qty,
    "reserved" = v."reserved" + aq.qty
FROM active_qty aq
WHERE v.id = aq.vid;

-- Resincronizar Product.inStock = disponible (stock - reserved) en todas las variantes.
UPDATE "Product" p
SET "inStock" = COALESCE(sub.available, 0)
FROM (
  SELECT "productId" AS pid, SUM("stock" - "reserved")::int AS available
  FROM "ProductVariant"
  GROUP BY "productId"
) sub
WHERE p.id = sub.pid;
