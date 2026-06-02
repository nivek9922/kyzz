'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

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

    const newFeatured = !product.isFeatured;

    await prisma.product.update({
      where: { id: productId },
      data: { isFeatured: newFeatured },
    });

    revalidatePath('/admin/products');
    revalidatePath(`/admin/product/${product.slug}`);
    revalidatePath('/');
    revalidatePath('/coleccion-especial');
    updateTag(`product:${product.slug}`);

    return { ok: true, isFeatured: newFeatured };
  } catch (error) {
    console.error(error);
    return { ok: false, message: 'Error al actualizar el producto' };
  }
};
