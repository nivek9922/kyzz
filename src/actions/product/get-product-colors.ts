'use server';

import prisma from '@/lib/prisma';

export interface ProductColor { colorName: string; colorHex: string; count: number; }

export async function getProductColors(): Promise<ProductColor[]> {
  const colors = await prisma.colorPalette.findMany({
    where:   { productColors: { some: {} } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      name: true,
      hex:  true,
      _count: { select: { productColors: true } },
    },
  });
  return colors.map((c) => ({
    colorName: c.name,
    colorHex:  c.hex,
    count:     c._count.productColors,
  }));
}
