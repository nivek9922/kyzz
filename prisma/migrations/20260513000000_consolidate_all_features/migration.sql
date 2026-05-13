-- ============================================================
-- Migración consolidada: captura todos los cambios aplicados
-- con `prisma db push` que no tenían archivo de migración.
-- Incluye: ShippingStatus, Category.slug, Order nuevos campos,
-- SiteConfig, Subscriber, Product timestamps, User.password nullable
-- ============================================================

-- CreateEnum
CREATE TYPE "ShippingStatus" AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'returned');

-- DropIndex
DROP INDEX IF EXISTS "Product_gender_idx";

-- AlterTable: Category — agregar slug
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "slug" TEXT NOT NULL DEFAULT '';

-- AlterTable: Order — campos de envío
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
                    ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
                    ADD COLUMN IF NOT EXISTS "shippedAt" TIMESTAMP(3),
                    ADD COLUMN IF NOT EXISTS "shippingNotes" TEXT,
                    ADD COLUMN IF NOT EXISTS "shippingStatus" "ShippingStatus" NOT NULL DEFAULT 'pending',
                    ADD COLUMN IF NOT EXISTS "trackingCode" TEXT;

-- AlterTable: Product — timestamps y eliminar gender
ALTER TABLE "Product" DROP COLUMN IF EXISTS "gender",
                      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: User — password nullable
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- DropEnum (solo si existe)
DROP TYPE IF EXISTS "Gender";

-- CreateTable: SiteConfig
CREATE TABLE IF NOT EXISTS "SiteConfig" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "heroTitle" TEXT NOT NULL DEFAULT 'Kyzz: Basics for every you',
    "heroSubtitle" TEXT NOT NULL DEFAULT 'Nueva colección',
    "heroCta" TEXT NOT NULL DEFAULT 'Explorar colección',
    "heroImageUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Subscriber
CREATE TABLE IF NOT EXISTS "Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");
