"use server";

import prisma from "@/lib/prisma";

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

  return {
    currentPage: page,
    totalPages: Math.ceil(totalCount / take),
    products: products.map((p) => ({
      ...p,
      images: p.ProductImage.map((img) => img.url),
    })),
  };
};
