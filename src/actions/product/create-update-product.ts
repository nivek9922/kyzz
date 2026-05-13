'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Product, Size, Prisma } from '@prisma/client';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';
cloudinary.config(process.env.CLOUDINARY_URL ?? '');

const FEATURED_LIMIT = 3;

const productSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(255),
  slug: z.string().min(3).max(255),
  description: z.string(),
  price: z.coerce
    .number()
    .min(0)
    .transform((val) => Number(val.toFixed(2))),
  inStock: z.coerce
    .number()
    .min(0)
    .transform((val) => Number(val.toFixed(0))),
  categoryId: z.string().uuid(),
  sizes: z.coerce.string().transform((val) => val.split(',')),
  tags: z.string(),
  isFeatured: z.coerce.boolean().optional().default(false),
});

export const createUpdateProduct = async (formData: FormData) => {
  const data = Object.fromEntries(formData);
  const productParsed = productSchema.safeParse(data);

  if (!productParsed.success) {
    console.log(productParsed.error);
    return { ok: false, message: 'Datos inválidos' };
  }

  const product = productParsed.data;
  product.slug = product.slug.toLowerCase().replace(/ /g, '-').trim();

  const { id, ...rest } = product;

  try {
    const prismaTx = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let savedProduct: Product;
      const tagsArray = rest.tags.split(',').map((tag) => tag.trim().toLowerCase());

      // ── Featured collection enforcement ────────────────────────────
      // Business rule: max 3 featured products.
      // If a 4th is set, remove isFeatured from the oldest one (by createdAt).
      if (rest.isFeatured) {
        const currentFeatured = await tx.product.findMany({
          where: {
            isFeatured: true,
            // exclude the product being edited so we don't count itself
            ...(id ? { id: { not: id } } : {}),
          },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });

        if (currentFeatured.length >= FEATURED_LIMIT) {
          // Unfeature the oldest one to keep exactly FEATURED_LIMIT
          await tx.product.update({
            where: { id: currentFeatured[0].id },
            data: { isFeatured: false },
          });
        }
      }
      // ───────────────────────────────────────────────────────────────

      if (id) {
        savedProduct = await tx.product.update({
          where: { id },
          data: {
            ...rest,
            sizes: { set: rest.sizes as Size[] },
            tags: { set: tagsArray },
          },
        });
      } else {
        savedProduct = await tx.product.create({
          data: {
            ...rest,
            sizes: { set: rest.sizes as Size[] },
            tags: { set: tagsArray },
          },
        });
      }

      // ── Image upload ────────────────────────────────────────────────
      const incomingFiles = formData.getAll('images') as File[];
      if (incomingFiles.length > 0) {
        // Enforce 2-image limit: check how many already exist
        const existingCount = await tx.productImage.count({
          where: { productId: savedProduct.id },
        });
        const allowedCount = Math.max(0, 2 - existingCount);
        const filesToUpload = incomingFiles.slice(0, allowedCount);

        if (filesToUpload.length > 0) {
          const images = await uploadImages(filesToUpload);
          if (!images) {
            throw new Error('No se pudo cargar las imágenes, rolling back');
          }
          await tx.productImage.createMany({
            data: images.map((image) => ({
              url: image!,
              productId: savedProduct.id,
            })),
          });
        }
      }

      return { product: savedProduct };
    });

    revalidatePath('/admin/products');
    revalidatePath(`/admin/product/${prismaTx.product.slug}`);
    revalidatePath(`/product/${prismaTx.product.slug}`);
    revalidatePath('/');

    return { ok: true, product: prismaTx.product };
  } catch (error) {
    console.error(error);
    return { ok: false, message: 'No se pudo guardar el producto' };
  }
};

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const uploadImages = async (images: File[]) => {
  try {
    const uploadPromises = images.map(async (image) => {
      const mimeType = image.type || 'image/jpeg';
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        console.error(`Tipo de imagen no soportado: ${mimeType}`);
        return null;
      }
      try {
        const buffer = await image.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');
        return cloudinary.uploader
          .upload(`data:${mimeType};base64,${base64Image}`)
          .then((r) => r.secure_url);
      } catch (error) {
        console.error('Error subiendo imagen a Cloudinary:', error);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    if (results.some((r) => r === null)) return null;
    return results;
  } catch (error) {
    console.error(error);
    return null;
  }
};
