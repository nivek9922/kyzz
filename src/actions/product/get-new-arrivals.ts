'use server';

import prisma from '@/lib/prisma';
import type { ProductColorsMap } from './product-pagination';

export const getNewArrivals = async (limit = 8) => {
  try {
    const raw = await prisma.product.findMany({
      take: limit * 2,
      where: { isArchived: false, inStock: { gt: 0 } },
      include: {
        ProductImage:  { take: 2, select: { url: true } },
        ProductColors: { take: 1, include: { images: { take: 1, select: { id: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Incluye productos que tengan ProductImage O imágenes por color (productos con variantes).
    const products = raw
      .filter(p => p.ProductImage.length > 0 || p.ProductColors.some(c => c.images.length > 0))
      .slice(0, limit)
      .map(p => ({ ...p, images: p.ProductImage.map(img => img.url) }));

    const productIds = products.map(p => p.id);
    const colorRows  = await prisma.productColor.findMany({
      where: { productId: { in: productIds } },
      include: {
        paletteColor: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 2 },
      },
      orderBy: { paletteColor: { sortOrder: 'asc' } },
    });

    const variantColors: ProductColorsMap = {};
    for (const row of colorRows) {
      if (!variantColors[row.productId]) variantColors[row.productId] = [];
      variantColors[row.productId].push({
        id:         row.paletteColorId,
        name:       row.paletteColor.name,
        hex:        row.paletteColor.hex,
        image:      row.images[0]?.url ?? null,
        imageHover: row.images[1]?.url ?? null,
      });
    }

    return { products, variantColors };
  } catch {
    throw new Error('No se pudieron cargar los productos recientes');
  }
};
