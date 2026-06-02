'use server';

import { v2 as cloudinary } from 'cloudinary';
import { revalidatePath, updateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

cloudinary.config(process.env.CLOUDINARY_URL ?? '');

// ─── Agregar color a producto con imágenes ────────────────────────────────────
export async function addProductColor(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, error: 'No autorizado' };

  const productId      = formData.get('productId') as string;
  const paletteColorId = formData.get('paletteColorId') as string;
  const images         = formData.getAll('images') as File[];

  if (!productId || !paletteColorId) return { ok: false, error: 'Datos incompletos' };

  try {
    // Crear el ProductColor (la relación producto↔color)
    const productColor = await prisma.productColor.create({
      data: { productId, paletteColorId },
    });

    // Subir imágenes a Cloudinary si se enviaron
    if (images.length > 0) {
      const uploadedUrls = await Promise.all(
        images.map(async (img, i) => {
          const bytes  = await img.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const b64    = buffer.toString('base64');
          const mime   = img.type;
          const result = await cloudinary.uploader.upload(
            `data:${mime};base64,${b64}`,
            { folder: 'kyzz/products' }
          );
          return { url: result.secure_url, sortOrder: i };
        })
      );

      await prisma.productColorImage.createMany({
        data: uploadedUrls.map((u) => ({ ...u, productColorId: productColor.id })),
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { slug: true },
    });

    revalidatePath(`/admin/product/${product?.slug}`);
    revalidatePath(`/product/${product?.slug}`);
    updateTag(`product:${product?.slug}`);

    // Retornar las imágenes creadas para actualizar el estado del cliente
    const createdImages = await prisma.productColorImage.findMany({
      where:   { productColorId: productColor.id },
      orderBy: { sortOrder: 'asc' },
      select:  { id: true, url: true, sortOrder: true },
    });

    return { ok: true, productColorId: productColor.id, images: createdImages };
  } catch (error) {
    console.error(error);
    return { ok: false, error: 'No se pudo agregar el color (puede que ya exista)' };
  }
}

// ─── Eliminar color de producto (y sus imágenes en Cloudinary) ────────────────
export async function removeProductColor(productColorId: string) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, error: 'No autorizado' };

  try {
    const pc = await prisma.productColor.findUnique({
      where: { id: productColorId },
      include: {
        images:  true,
        product: { select: { slug: true } },
      },
    });
    if (!pc) return { ok: false, error: 'Color no encontrado' };

    // Eliminar imágenes en Cloudinary (solo las que son URLs de Cloudinary, no locales)
    await Promise.all(
      pc.images
        .filter((img) => img.url.startsWith('http'))
        .map(async (img) => {
          const publicId = img.url.split('/').slice(-2).join('/').split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        })
    );

    // La BD elimina en cascada ProductColorImage
    await prisma.productColor.delete({ where: { id: productColorId } });

    revalidatePath(`/admin/product/${pc.product.slug}`);
    revalidatePath(`/product/${pc.product.slug}`);
    updateTag(`product:${pc.product.slug}`);

    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: 'No se pudo eliminar el color' };
  }
}

// ─── Agregar imagen a un ProductColor ya existente ───────────────────────────
export async function addColorImage(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, error: 'No autorizado' };

  const productColorId = formData.get('productColorId') as string;
  const image          = formData.get('image') as File;

  if (!productColorId || !image) return { ok: false, error: 'Datos incompletos' };

  try {
    const count = await prisma.productColorImage.count({ where: { productColorId } });

    const bytes  = await image.arrayBuffer();
    const b64    = Buffer.from(bytes).toString('base64');
    const result = await cloudinary.uploader.upload(
      `data:${image.type};base64,${b64}`,
      { folder: 'kyzz/products' }
    );

    const img = await prisma.productColorImage.create({
      data: { url: result.secure_url, sortOrder: count, productColorId },
    });

    const pc = await prisma.productColor.findUnique({
      where: { id: productColorId },
      include: { product: { select: { slug: true } } },
    });

    revalidatePath(`/admin/product/${pc?.product.slug}`);
    revalidatePath(`/product/${pc?.product.slug}`);
    updateTag(`product:${pc?.product.slug}`);

    return { ok: true, image: img };
  } catch (error) {
    console.error(error);
    return { ok: false, error: 'No se pudo subir la imagen' };
  }
}

// ─── Eliminar imagen de ProductColor ─────────────────────────────────────────
export async function removeColorImage(imageId: string) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, error: 'No autorizado' };

  try {
    const img = await prisma.productColorImage.findUnique({
      where: { id: imageId },
      include: {
        productColor: {
          include: { product: { select: { slug: true } } },
        },
      },
    });
    if (!img) return { ok: false, error: 'Imagen no encontrada' };

    const publicId = img.url.split('/').slice(-2).join('/').split('.')[0];
    await cloudinary.uploader.destroy(publicId);
    await prisma.productColorImage.delete({ where: { id: imageId } });

    revalidatePath(`/admin/product/${img.productColor.product.slug}`);
    revalidatePath(`/product/${img.productColor.product.slug}`);
    updateTag(`product:${img.productColor.product.slug}`);

    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: 'No se pudo eliminar la imagen' };
  }
}

// ─── Obtener colores de un producto (con sus imágenes) ───────────────────────
export async function getProductColors(productId: string) {
  return prisma.productColor.findMany({
    where:   { productId },
    include: {
      paletteColor: true,
      images:       { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { paletteColor: { sortOrder: 'asc' } },
  });
}
