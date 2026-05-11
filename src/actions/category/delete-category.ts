'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export const deleteCategory = async (id: string) => {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado' };

  try {
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return {
        ok: false,
        message: `No se puede eliminar: hay ${productCount} producto${productCount > 1 ? 's' : ''} asignado${productCount > 1 ? 's' : ''} a esta categoría`,
      };
    }

    await prisma.category.delete({ where: { id } });
    revalidatePath('/admin/categorias');
    revalidatePath('/products');
    return { ok: true };
  } catch {
    return { ok: false, message: 'Error al eliminar la categoría' };
  }
};
