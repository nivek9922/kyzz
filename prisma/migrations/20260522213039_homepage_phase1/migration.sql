-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "SiteConfig" ADD COLUMN     "brandStoryImageUrl" TEXT,
ADD COLUMN     "brandStoryText" TEXT,
ADD COLUMN     "heroVideoUrl" TEXT;
