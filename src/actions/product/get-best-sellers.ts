"use server";

import prisma from "@/lib/prisma";
import type { ProductColorsMap } from './product-pagination';

export const getBestSellers = async (limit = 8) => {
  try {
    // Aggregate sold quantity per product across paid orders
    const topItems = await prisma.orderItem.groupBy({
      by:      ['productId'],
      where:   { order: { isPaid: true } },
      _sum:    { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take:    limit * 2, // fetch extra to account for filtered-out products
    });

    if (topItems.length === 0) return { products: [], variantColors: {} };

    const topIds = topItems.map((t) => t.productId);

    const rawProducts = await prisma.product.findMany({
      where:   { id: { in: topIds }, isArchived: false, inStock: { gt: 0 } },
      include: { ProductImage: { take: 2, select: { url: true } } },
    });

    // Preserve ranking order and filter out products with no images
    const productMap = new Map(rawProducts.map((p) => [p.id, p]));
    const products = topIds
      .map((id) => productMap.get(id))
      .filter((p): p is (typeof rawProducts)[0] => p !== undefined && p.ProductImage.length > 0)
      .slice(0, limit);

    if (products.length === 0) return { products: [], variantColors: {} };

    const productIds = products.map((p) => p.id);
    const colorRows  = await prisma.productColor.findMany({
      where:   { productId: { in: productIds } },
      include: {
        paletteColor: true,
        images:       { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
      orderBy: { paletteColor: { sortOrder: 'asc' } },
    });

    const variantColors: ProductColorsMap = {};
    for (const row of colorRows) {
      if (!variantColors[row.productId]) variantColors[row.productId] = [];
      variantColors[row.productId].push({
        id:    row.paletteColorId,
        name:  row.paletteColor.name,
        hex:   row.paletteColor.hex,
        image: row.images[0]?.url ?? null,
      });
    }

    return {
      products: products.map((p) => ({
        ...p,
        images: p.ProductImage.map((img) => img.url),
      })),
      variantColors,
    };
  } catch {
    return { products: [], variantColors: {} };
  }
};
