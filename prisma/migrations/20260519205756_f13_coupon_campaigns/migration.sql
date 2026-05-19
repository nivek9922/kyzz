-- CreateEnum
CREATE TYPE "CouponCampaign" AS ENUM ('newsletter_welcome', 'first_purchase', 'seasonal', 'influencer', 'category', 'free_shipping', 'vip', 'general');

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "campaign" "CouponCampaign" NOT NULL DEFAULT 'general',
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN     "welcomeCouponId" TEXT;

-- AddForeignKey
ALTER TABLE "Subscriber" ADD CONSTRAINT "Subscriber_welcomeCouponId_fkey" FOREIGN KEY ("welcomeCouponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
