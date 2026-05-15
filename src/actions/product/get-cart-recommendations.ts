'use server';

import prisma from '@/lib/prisma';
import {
  type ColorFamily,
  COLOR_COMPATIBILITY,
  CATEGORY_COMPLEMENTS,
  hexToColorFamily,
} from '@/config/color-compatibility';

export interface RecommendedProduct {
  id:       string;
  title:    string;
  slug:     string;
  price:    number;
  image:    string;  // first color image, fallback to first product image, fallback ''
  category: string;  // category slug
}

export async function getCartRecommendations(
  cartProductIds: string[]
): Promise<RecommendedProduct[]> {
  if (cartProductIds.length === 0) return [];

  // 1. Fetch cart items' category slugs and palette hex codes
  const cartItems = await prisma.product.findMany({
    where: { id: { in: cartProductIds } },
    select: {
      category: { select: { slug: true } },
      ProductColors: {
        select: {
          paletteColor: { select: { hex: true } },
        },
      },
    },
  });

  // 2. Build sets of cart categories and color families
  const cartCatSlugs = new Set<string>(
    cartItems.map((item) => item.category.slug)
  );

  const cartColorFamilies = new Set<ColorFamily>();
  for (const item of cartItems) {
    for (const pc of item.ProductColors) {
      if (pc.paletteColor?.hex) {
        cartColorFamilies.add(hexToColorFamily(pc.paletteColor.hex));
      }
    }
  }

  // 3. Determine target complement categories
  const complementSlugs = new Set<string>();
  for (const catSlug of cartCatSlugs) {
    const complements = CATEGORY_COMPLEMENTS[catSlug] ?? [];
    for (const c of complements) {
      complementSlugs.add(c);
    }
  }
  const targetSlugs = [...complementSlugs];

  // 4. Query up to 30 candidate products
  const candidates = await prisma.product.findMany({
    where: {
      id:       { notIn: cartProductIds },
      variants: { some: { stock: { gt: 0 } } },
      ...(targetSlugs.length > 0
        ? { category: { slug: { in: targetSlugs } } }
        : {}),
    },
    take: 30,
    select: {
      id:         true,
      title:      true,
      slug:       true,
      price:      true,
      isFeatured: true,
      category:   { select: { slug: true } },
      ProductColors: {
        take: 1,
        select: {
          images: {
            take: 1,
            orderBy: { sortOrder: 'asc' },
            select: { url: true },
          },
          paletteColor: { select: { hex: true } },
        },
      },
      ProductImage: {
        take: 1,
        orderBy: { id: 'asc' },
        select: { url: true },
      },
    },
  });

  // 5. Score each candidate
  const scored = candidates.map((c) => {
    let score = 0;
    const candidateCatSlug = c.category.slug;

    // +3 for each cart category that lists this product's category as complement
    for (const cartCat of cartCatSlugs) {
      const complements = CATEGORY_COMPLEMENTS[cartCat] ?? [];
      if (complements.includes(candidateCatSlug)) {
        score += 3;
      }
    }

    // -1 if candidate category already in cart (penalize redundancy)
    if (cartCatSlugs.has(candidateCatSlug)) {
      score -= 1;
    }

    // +2 if candidate has any color family compatible with any cart color family
    const candidateColorFamilies: ColorFamily[] = [];
    for (const pc of c.ProductColors) {
      if (pc.paletteColor?.hex) {
        candidateColorFamilies.push(hexToColorFamily(pc.paletteColor.hex));
      }
    }

    let colorBoostApplied = false;
    for (const cartFamily of cartColorFamilies) {
      if (colorBoostApplied) break;
      const compatible = COLOR_COMPATIBILITY[cartFamily] ?? [];
      for (const candidateFamily of candidateColorFamilies) {
        if (compatible.includes(candidateFamily)) {
          score += 2;
          colorBoostApplied = true;
          break;
        }
      }
    }

    // +1 if featured
    if (c.isFeatured) {
      score += 1;
    }

    // +1 neutral boost if no cart color families
    if (cartColorFamilies.size === 0) {
      score += 1;
    }

    // Resolve image
    const image = c.ProductColors[0]?.images[0]?.url ?? c.ProductImage[0]?.url ?? '';

    return { score, product: { id: c.id, title: c.title, slug: c.slug, price: c.price, image, category: candidateCatSlug } };
  });

  // 6. Sort by score DESC and return top 4
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 4).map((s) => s.product);
}
