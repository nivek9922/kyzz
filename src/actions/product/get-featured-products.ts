"use server";

import prisma from "@/lib/prisma";

export const getFeaturedProducts = async () => {
  try {
    const products = await prisma.product.findMany({
      take: 3,
      where: { isFeatured: true },
      include: {
        ProductImage: {
          take: 2,
          select: { url: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return products.map((product) => ({
      ...product,
      images: product.ProductImage.map((img) => img.url),
    }));
  } catch {
    throw new Error("No se pudieron cargar los productos destacados");
  }
};
