"use server";

import prisma from "@/lib/prisma";

export type QuickSearchResult = {
  id:         string;
  title:      string;
  slug:       string;
  price:      number;
  image:      string;
  category:   string;
  isFeatured: boolean;
};

export const searchProductsQuick = async (query: string): Promise<QuickSearchResult[]> => {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim().toLowerCase();

  try {
    const products = await prisma.product.findMany({
      take: 8,
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { tags:  { has: q } },
        ],
      },
      select: {
        id:         true,
        title:      true,
        slug:       true,
        price:      true,
        isFeatured: true,
        category:   { select: { name: true } },
        ProductImage: { take: 1, select: { url: true } },
        ProductColors: {
          take: 1,
          select: {
            images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
          },
        },
      },
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt:  'desc' },
      ],
    });

    return products.map((p) => ({
      id:         p.id,
      title:      p.title,
      slug:       p.slug,
      price:      p.price,
      isFeatured: p.isFeatured,
      category:   p.category.name,
      // Imagen del producto base, o de su primera variante de color
      image:      p.ProductImage[0]?.url ?? p.ProductColors[0]?.images[0]?.url ?? '',
    }));
  } catch {
    return [];
  }
};
