"use server";

import prisma from "@/lib/prisma";
import type { ProductColorsMap } from './product-pagination';

interface Options {
  page?: number;
  take?: number;
}

export const getFeaturedProductsPaginated = async ({ page = 1, take = 12 }: Options = {}) => {
  if (isNaN(Number(page)) || page < 1) page = 1;

  const where = { isFeatured: true };

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      take,
      skip: (page - 1) * take,
      where,
      include: {
        ProductImage: { take: 2, select: { url: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.product.count({ where }),
  ]);

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
    currentPage:  page,
    totalPages:   Math.ceil(totalCount / take),
    products:     products.map((p) => ({
      ...p,
      images: p.ProductImage.map((img) => img.url),
    })),
    variantColors,
  };
};
