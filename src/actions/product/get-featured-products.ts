"use server";

import prisma from "@/lib/prisma";
import type { ProductColorsMap } from './product-pagination';

export const getFeaturedProducts = async () => {
  try {
    const products = await prisma.product.findMany({
      take: 3,
      // Auto out-of-stock: los agotados no ocupan un slot curado del home.
      where: { isFeatured: true, inStock: { gt: 0 } },
      include: {
        ProductImage: { take: 2, select: { url: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const productIds = products.map((p) => p.id);
    const colorRows  = await prisma.productColor.findMany({
      where: { productId: { in: productIds } },
      include: {
        paletteColor: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
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
    throw new Error("No se pudieron cargar los productos destacados");
  }
};
