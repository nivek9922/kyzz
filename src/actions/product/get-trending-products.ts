"use server";

import prisma from "@/lib/prisma";
import type { QuickSearchResult } from "./search-products-quick";

const toResult = (p: {
  id: string; title: string; slug: string; price: number; isFeatured: boolean;
  category: { name: string };
  ProductImage: { url: string }[];
  ProductColors: { images: { url: string }[] }[];
}): QuickSearchResult => ({
  id:         p.id,
  title:      p.title,
  slug:       p.slug,
  price:      p.price,
  isFeatured: p.isFeatured,
  category:   p.category.name,
  image:      p.ProductImage[0]?.url ?? p.ProductColors[0]?.images[0]?.url ?? '',
});

const SELECT = {
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
} as const;

// Producto con imagen en producto base O en variante de color
const HAS_IMAGE = {
  OR: [
    { ProductImage:  { some: {} } },
    { ProductColors: { some: { images: { some: {} } } } },
  ],
};

export const getTrendingProducts = async (limit = 5): Promise<QuickSearchResult[]> => {
  try {
    // Más pedidos = más populares
    const topItems = await prisma.orderItem.groupBy({
      by:       ['productId'],
      _sum:     { quantity: true },
      orderBy:  { _sum: { quantity: 'desc' } },
      take:     limit * 2,
    });

    if (topItems.length > 0) {
      const ids = topItems.map((i) => i.productId).filter(Boolean);
      const products = await prisma.product.findMany({
        where:  { id: { in: ids }, isArchived: false, ...HAS_IMAGE },
        select: SELECT,
        take:   limit,
      });

      const byId = new Map(products.map((p) => [p.id, p]));
      const ordered = ids
        .map((id) => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .slice(0, limit)
        .map(toResult);

      if (ordered.length > 0) return ordered;
    }
  } catch { /* fallthrough */ }

  // Fallback: productos destacados
  try {
    const featured = await prisma.product.findMany({
      where:   { isFeatured: true, isArchived: false, ...HAS_IMAGE },
      select:  SELECT,
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });
    return featured.map(toResult);
  } catch {
    return [];
  }
};
