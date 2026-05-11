"use server";

import prisma from "@/lib/prisma";

interface PaginationOptions {
  page?: number;
  take?: number;
  categoryId?: string;
  query?: string;
}

export const getPaginatedProductsWithImages = async ({
  page = 1,
  take = 12,
  categoryId,
  query,
}: PaginationOptions) => {
  if (isNaN(Number(page))) page = 1;
  if (page < 1) page = 1;

  const where = {
    ...(categoryId ? { categoryId } : {}),
    ...(query ? {
      OR: [
        { title: { contains: query, mode: 'insensitive' as const } },
        { slug: { contains: query, mode: 'insensitive' as const } },
        { tags: { has: query.toLowerCase() } },
      ],
    } : {}),
  };

  try {
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        take,
        skip: (page - 1) * take,
        include: {
          ProductImage: {
            take: 2,
            select: { url: true },
          },
          category: {
            select: { name: true },
          },
        },
        where,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      currentPage: page,
      totalPages: Math.ceil(totalCount / take),
      products: products.map((product) => ({
        ...product,
        images: product.ProductImage.map((image) => image.url),
      })),
    };
  } catch (error) {
    throw new Error("No se pudo cargar los productos");
  }
};
