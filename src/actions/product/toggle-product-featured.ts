'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const FEATURED_LIMIT = 3;

export const toggleProductFeatured = async (productId: string) => {
  const session = await auth();
  if (session?.user.role !== 'admin') {
    return { ok: false, message: 'No autorizado' };
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, slug: true, isFeatured: true },
    });

    if (!product) return { ok: false, message: 'Producto no encontrado' };

    let newFeatured = !product.isFeatured;

    if (newFeatured) {
      // Enforce FEATURED_LIMIT: unfeature the oldest if at capacity
      const currentFeatured = await prisma.product.findMany({
        where: { isFeatured: true, id: { not: productId } },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });

      if (currentFeatured.length >= FEATURED_LIMIT) {
        await prisma.product.update({
          where: { id: currentFeatured[0].id },
          data: { isFeatured: false },
        });
      }
    }

    await prisma.product.update({
      where: { id: productId },
      data: { isFeatured: newFeatured },
    });

    revalidatePath('/admin/products');
    revalidatePath(`/admin/product/${product.slug}`);
    revalidatePath('/');
    revalidatePath('/coleccion-especial');

    return { ok: true, isFeatured: newFeatured };
  } catch (error) {
    console.error(error);
    return { ok: false, message: 'Error al actualizar el producto' };
  }
};
