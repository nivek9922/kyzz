'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export const toggleProductArchived = async (productId: string) => {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado' };

  try {
    const product = await prisma.product.findUnique({
      where:  { id: productId },
      select: { isArchived: true },
    });

    if (!product) return { ok: false, message: 'Producto no encontrado' };

    const next = !product.isArchived;
    await prisma.product.update({
      where: { id: productId },
      data:  { isArchived: next },
    });

    revalidatePath('/admin/products');
    revalidatePath('/');
    return { ok: true, isArchived: next };
  } catch {
    return { ok: false, message: 'Error al archivar el producto' };
  }
};
