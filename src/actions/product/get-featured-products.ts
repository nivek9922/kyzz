"use server";

import prisma from "@/lib/prisma";

/**
 * Devuelve hasta `limit` productos marcados como destacados (isFeatured = true).
 * El límite de negocio es 3 (colección especial), pero se acepta como parámetro
 * para flexibilidad futura.
 */
export const getFeaturedProducts = async (limit = 3) => {
  try {
    const products = await prisma.product.findMany({
      take: limit,
      where: { isFeatured: true },
      include: {
        ProductImage: {
          take: 2,
          select: { url: true },
        },
      },
      orderBy: { title: "asc" },
    });

    return products.map((product) => ({
      ...product,
      images: product.ProductImage.map((img) => img.url),
    }));
  } catch {
    throw new Error("No se pudieron cargar los productos destacados");
  }
};
