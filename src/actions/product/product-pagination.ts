"use server";

import { Prisma, Size } from "@prisma/client";
import prisma from "@/lib/prisma";

export type SortOption = 'newest' | 'price_asc' | 'price_desc';

// Colores de un producto en el grid (incluye primera imagen para swatch thumbnail)
export interface ProductColorEntry { id: string; name: string; hex: string; image: string | null; }
export type ProductColorsMap = Record<string, ProductColorEntry[]>; // productId → colors

// Tipos legacy
export type VariantColor    = ProductColorEntry & { slug: string };
export type VariantColorMap = ProductColorsMap;

interface PaginationOptions {
  page?:        number;
  take?:        number;
  categoryId?:  string;
  query?:       string;
  sizes?:       Size[];
  minPrice?:    number;
  maxPrice?:    number;
  sortBy?:      SortOption;
  colorNames?:  string[];
}

export const getPaginatedProductsWithImages = async ({
  page = 1,
  take = 12,
  categoryId,
  query,
  sizes,
  minPrice,
  maxPrice,
  sortBy = 'newest',
  colorNames,
}: PaginationOptions) => {
  if (isNaN(Number(page))) page = 1;
  if (page < 1) page = 1;

  const where: Prisma.ProductWhereInput = {
    ...(categoryId ? { categoryId } : {}),
    ...(sizes && sizes.length > 0 ? { sizes: { hasSome: sizes } } : {}),
    ...(minPrice !== undefined || maxPrice !== undefined ? {
      price: {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      },
    } : {}),
    // Filtro de colores: OR entre todos los colores seleccionados
    ...(colorNames && colorNames.length > 0 ? {
      ProductColors: {
        some: {
          paletteColor: {
            name: { in: colorNames, mode: 'insensitive' },
          },
        },
      },
    } : {}),
    ...(query ? {
      OR: [
        { title:       { contains: query, mode: 'insensitive' } },
        { slug:        { contains: query, mode: 'insensitive' } },
        { tags:        { has: query.toLowerCase() } },
      ],
    } : {}),
  };

  const orderBy =
    sortBy === 'price_asc'  ? { price: 'asc'  as const } :
    sortBy === 'price_desc' ? { price: 'desc' as const } :
                              { createdAt: 'desc' as const };

  try {
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        take,
        skip: (page - 1) * take,
        include: {
          ProductImage: { take: 2, select: { url: true } },
          category:     { select: { name: true } },
        },
        where,
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    // Batch-fetch de colores por producto (sin N+1), incluye primera imagen
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
      products:     products.map((p) => ({ ...p, images: p.ProductImage.map((i) => i.url) })),
      variantColors,
    };
  } catch {
    throw new Error("No se pudo cargar los productos");
  }
};
