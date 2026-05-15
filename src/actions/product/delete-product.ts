'use server';

import { v2 as cloudinary } from 'cloudinary';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

cloudinary.config(process.env.CLOUDINARY_URL ?? '');

export const deleteProduct = async (productId: string) => {
  const session = await auth();
  if (session?.user.role !== 'admin') {
    return { ok: false, message: 'No autorizado' };
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        ProductImage: true,
        OrderItem: { take: 1 },
      },
    });

    if (!product) return { ok: false, message: 'Producto no encontrado' };

    if (product.OrderItem.length > 0) {
      return {
        ok: false,
        message: 'Este producto tiene pedidos asociados y no puede eliminarse',
      };
    }

    // Eliminar imágenes de Cloudinary
    const cloudinaryDeletes = product.ProductImage
      .filter((img) => img.url.startsWith('http'))
      .map((img) => {
        const name = img.url.split('/').pop()?.split('.')[0] ?? '';
        return cloudinary.uploader.destroy(name);
      });
    await Promise.allSettled(cloudinaryDeletes);

    // Eliminar registros relacionados que no tienen cascade en BD
    await prisma.productImage.deleteMany({ where: { productId } });

    // Eliminar producto (ProductColor, ProductVariant ya tienen onDelete: Cascade)
    await prisma.product.delete({ where: { id: productId } });

    revalidatePath('/admin/products');
    revalidatePath('/products');

    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, message: 'Error al eliminar el producto' };
  }
};
