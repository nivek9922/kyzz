'use server';

import prisma from '@/lib/prisma';

export async function getWishlistProducts(ids: string[]) {
  if (ids.length === 0) return [];

  return prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id:          true,
      title:       true,
      description: true,
      slug:        true,
      price:       true,
      inStock:     true,
      ProductImage: { take: 1, select: { url: true } },
      ProductColors: {
        take: 1,
        select: { images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } } },
      },
    },
  });
}
