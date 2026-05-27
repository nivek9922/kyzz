import prisma from '@/lib/prisma';

export const getFeaturedCount = async (): Promise<number> => {
  try {
    return await prisma.product.count({
      where: { isFeatured: true, isArchived: false, inStock: { gt: 0 } },
    });
  } catch {
    return 0;
  }
};
