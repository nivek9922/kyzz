"use server";

import prisma from "@/lib/prisma";

export const searchProducts = async (query: string) => {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim().toLowerCase();

  try {
    const products = await prisma.product.findMany({
      take: 12,
      where: {
        isArchived: false,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { tags:  { has: q } },
        ],
      },
      include: {
        ProductImage: { take: 2, select: { url: true } },
        ProductColors: {
          take: 1,
          select: {
            images: { take: 2, orderBy: { sortOrder: 'asc' }, select: { url: true } },
          },
        },
      },
    });

    return products.map((p) => {
      const { ProductImage, ProductColors, ...rest } = p;
      const baseImages  = ProductImage.map((img) => img.url);
      const colorImages = ProductColors.flatMap((c) => c.images.map((i) => i.url));
      return {
        ...rest,
        // Las imágenes pueden estar en el producto base o en sus variantes de color
        images: baseImages.length > 0 ? baseImages : colorImages,
      };
    });
  } catch {
    return [];
  }
};
