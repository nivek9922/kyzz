-- Fase 1 Postventa: nuevos enums, extensión ReturnRequest, modelos ReturnRequestItem
-- y ReturnEvent, y campos quarantined/damaged en ProductVariant.
-- Todos los cambios son backward-compatible (nullable o con default).

-- ── Nuevos enums ─────────────────────────────────────────────────────────────
CREATE TYPE "PostSaleType" AS ENUM ('RETURN', 'SIZE_EXCHANGE', 'PRODUCT_EXCHANGE', 'DEFECTIVE', 'WARRANTY', 'KYZZ_ERROR');
CREATE TYPE "ReturnReasonCategory" AS ENUM ('WRONG_SIZE', 'CHANGED_MIND', 'NOT_AS_DESCRIBED', 'DEFECTIVE', 'DAMAGED_IN_TRANSIT', 'WRONG_ITEM_SENT', 'QUALITY_ISSUE', 'OTHER');
CREATE TYPE "ItemCondition" AS ENUM ('PERFECT', 'ACCEPTABLE', 'USED', 'DAMAGED', 'DEFECTIVE_CONF', 'INCOMPLETE');
CREATE TYPE "InventoryAction" AS ENUM ('PENDING_INSPECTION', 'RESTOCK', 'QUARANTINE', 'LIQUIDATE', 'DONATE', 'DESTROY');
CREATE TYPE "ShippingResponsibility" AS ENUM ('KYZZ', 'CUSTOMER');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- ── Extender enum ReturnStatus (nuevos estados de la máquina de estados) ─────
-- PostgreSQL 12+ soporta múltiples ADD VALUE en una sola transacción.
ALTER TYPE "ReturnStatus" ADD VALUE 'EVIDENCE_REQUIRED';
ALTER TYPE "ReturnStatus" ADD VALUE 'GUIDE_SENT';
ALTER TYPE "ReturnStatus" ADD VALUE 'IN_TRANSIT';
ALTER TYPE "ReturnStatus" ADD VALUE 'RECEIVED';
ALTER TYPE "ReturnStatus" ADD VALUE 'INSPECTING';
ALTER TYPE "ReturnStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "ReturnStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "ReturnStatus" ADD VALUE 'REJECTED_AFTER_INSPECT';
ALTER TYPE "ReturnStatus" ADD VALUE 'CLOSED';

-- ── ProductVariant: stock de cuarentena y unidades dañadas ───────────────────
ALTER TABLE "ProductVariant"
  ADD COLUMN "quarantined" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "damaged"     INTEGER NOT NULL DEFAULT 0;

-- Constraints: ni quarantined ni damaged pueden ser negativos
ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_quarantined_nonneg" CHECK ("quarantined" >= 0),
  ADD CONSTRAINT "ProductVariant_damaged_nonneg"     CHECK ("damaged"     >= 0);

-- ── Extender ReturnRequest con campos Fase 1 ─────────────────────────────────
ALTER TABLE "ReturnRequest"
  ADD COLUMN "rmaCode"             TEXT,
  ADD COLUMN "requestType"         "PostSaleType",
  ADD COLUMN "reasonCategory"      "ReturnReasonCategory",
  ADD COLUMN "returnWindowDays"    INTEGER,
  ADD COLUMN "expiresAt"           TIMESTAMP(3),
  ADD COLUMN "returnTrackingCode"  TEXT,
  ADD COLUMN "returnCarrier"       TEXT,
  ADD COLUMN "returnShippingCost"  DOUBLE PRECISION,
  ADD COLUMN "whoPayShipping"      "ShippingResponsibility",
  ADD COLUMN "receivedAt"          TIMESTAMP(3),
  ADD COLUMN "inspectedAt"         TIMESTAMP(3),
  ADD COLUMN "inspectedBy"         TEXT,
  ADD COLUMN "itemCondition"       "ItemCondition",
  ADD COLUMN "conditionNotes"      TEXT,
  ADD COLUMN "targetVariantId"     TEXT,
  ADD COLUMN "targetProductId"     TEXT,
  ADD COLUMN "replacementOrderId"  TEXT,
  ADD COLUMN "refundStatus"        "RefundStatus",
  ADD COLUMN "refundProcessedAt"   TIMESTAMP(3),
  ADD COLUMN "refundTransactionId" TEXT,
  ADD COLUMN "approvedBy"          TEXT,
  ADD COLUMN "approvedAt"          TIMESTAMP(3),
  ADD COLUMN "rejectedBy"          TEXT,
  ADD COLUMN "rejectedAt"          TIMESTAMP(3),
  ADD COLUMN "rejectionReason"     TEXT;

-- Unique + índices para rmaCode
CREATE UNIQUE INDEX "ReturnRequest_rmaCode_key" ON "ReturnRequest"("rmaCode");
CREATE INDEX "ReturnRequest_rmaCode_idx"        ON "ReturnRequest"("rmaCode");
CREATE INDEX "ReturnRequest_requestType_idx"    ON "ReturnRequest"("requestType");
CREATE INDEX "ReturnRequest_reasonCategory_idx" ON "ReturnRequest"("reasonCategory");

-- ── Nuevo modelo: ReturnRequestItem ──────────────────────────────────────────
CREATE TABLE "ReturnRequestItem" (
  "id"              TEXT            NOT NULL,
  "returnRequestId" TEXT            NOT NULL,
  "orderItemId"     TEXT            NOT NULL,
  "variantId"       TEXT            NOT NULL,
  "quantity"        INTEGER         NOT NULL,
  "inventoryAction" "InventoryAction" NOT NULL DEFAULT 'PENDING_INSPECTION',
  "restockedAt"     TIMESTAMP(3),
  "damagedQty"      INTEGER         NOT NULL DEFAULT 0,
  CONSTRAINT "ReturnRequestItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReturnRequestItem_returnRequestId_idx" ON "ReturnRequestItem"("returnRequestId");
ALTER TABLE "ReturnRequestItem"
  ADD CONSTRAINT "ReturnRequestItem_returnRequestId_fkey"
  FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Nuevo modelo: ReturnEvent (log inmutable de auditoría) ───────────────────
CREATE TABLE "ReturnEvent" (
  "id"              TEXT         NOT NULL,
  "returnRequestId" TEXT         NOT NULL,
  "actor"           TEXT         NOT NULL,
  "actorName"       TEXT         NOT NULL,
  "fromStatus"      TEXT,
  "toStatus"        TEXT         NOT NULL,
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReturnEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReturnEvent_returnRequestId_idx" ON "ReturnEvent"("returnRequestId");
ALTER TABLE "ReturnEvent"
  ADD CONSTRAINT "ReturnEvent_returnRequestId_fkey"
  FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
