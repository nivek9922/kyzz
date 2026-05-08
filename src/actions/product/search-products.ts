"use server";

import prisma from "@/lib/prisma";

export const searchProducts = async (query: string) => {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim().toLowerCase();

  try {
    const products = await prisma.product.findMany({
      take: 12,
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } },
        ],
      },
      include: {
        ProductImage: {
          take: 1,
          select: { url: true },
        },
      },
    });

    return products.map((p) => ({
      ...p,
      images: p.ProductImage.map((img) => img.url),
    }));
  } catch {
    return [];
  }
};
