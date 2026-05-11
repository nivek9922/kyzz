"use server";

import { Size } from "@prisma/client";
import prisma from "@/lib/prisma";

export type SortOption = 'newest' | 'price_asc' | 'price_desc';

interface PaginationOptions {
  page?: number;
  take?: number;
  categoryId?: string;
  query?: string;
  sizes?: Size[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: SortOption;
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
}: PaginationOptions) => {
  if (isNaN(Number(page))) page = 1;
  if (page < 1) page = 1;

  const where = {
    ...(categoryId ? { categoryId } : {}),
    ...(sizes && sizes.length > 0 ? { sizes: { hasSome: sizes } } : {}),
    ...(minPrice !== undefined || maxPrice !== undefined ? {
      price: {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      },
    } : {}),
    ...(query ? {
      OR: [
        { title: { contains: query, mode: 'insensitive' as const } },
        { slug:  { contains: query, mode: 'insensitive' as const } },
        { tags:  { has: query.toLowerCase() } },
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

    return {
      currentPage: page,
      totalPages:  Math.ceil(totalCount / take),
      products:    products.map((p) => ({ ...p, images: p.ProductImage.map((i) => i.url) })),
    };
  } catch {
    throw new Error("No se pudo cargar los productos");
  }
};
