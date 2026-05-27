'use server';

import prisma from '@/lib/prisma';
import type { ProductColorsMap } from './product-pagination';
import type { Product } from '@/interfaces';

export async function getWishlistProducts(ids: string[]): Promise<{
  products:      Product[];
  variantColors: ProductColorsMap;
}> {
  if (ids.length === 0) return { products: [], variantColors: {} };

  const raw = await prisma.product.findMany({
    where:   { id: { in: ids }, isArchived: false },
    include: { ProductImage: { take: 2, select: { url: true } } },
  });

  const products: Product[] = raw.map((p) => ({
    id:          p.id,
    title:       p.title,
    description: p.description,
    slug:        p.slug,
    price:       p.price,
    sizes:       p.sizes,
    tags:        p.tags,
    inStock:     p.inStock,
    isFeatured:  p.isFeatured,
    categoryId:  p.categoryId,
    images:      p.ProductImage.map((img) => img.url),
  }));

  const colorRows = await prisma.productColor.findMany({
    where:   { productId: { in: ids } },
    include: {
      paletteColor: true,
      images:       { orderBy: { sortOrder: 'asc' }, take: 2 },
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
}
