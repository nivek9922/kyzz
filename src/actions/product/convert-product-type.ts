'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Convierte un producto de modo "con colores" a modo "sin color":
 * elimina todos sus ProductColor (cascade: ProductColorImage + color-ProductVariant)
 * y sincroniza Product.inStock desde las variantes sin color restantes.
 */
export async function convertProductToNoColor(productId: string) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, error: 'No autorizado' };

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, slug: true },
    });
    if (!product) return { ok: false, error: 'Producto no encontrado' };

    // Eliminar todos los ProductColor del producto
    // La BD hace cascade: ProductColorImage y ProductVariant con colorId son eliminados
    await prisma.productColor.deleteMany({ where: { productId } });

    // Sincronizar inStock desde variantes sin color restantes
    const agg = await prisma.productVariant.aggregate({
      where:  { productId, colorId: null },
      _sum:   { stock: true },
    });
    await prisma.product.update({
      where: { id: productId },
      data:  { inStock: agg._sum.stock ?? 0 },
    });

    revalidatePath(`/admin/product/${product.slug}`);
    revalidatePath(`/product/${product.slug}`);
    revalidatePath('/admin/products');
    revalidateTag(`product:${product.slug}`);

    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: 'No se pudo convertir el producto' };
  }
}
