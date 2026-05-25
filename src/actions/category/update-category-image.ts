'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { v2 as cloudinary } from 'cloudinary';

const ALLOWED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']);
const MAX_BYTES = 7 * 1024 * 1024; // 7 MB

cloudinary.config(process.env.CLOUDINARY_URL ?? '');

// Extrae el public_id de una URL de Cloudinary para poder borrar la imagen anterior.
// Ej: https://res.cloudinary.com/cloud/image/upload/v123/kyzz/categories/abc.jpg → kyzz/categories/abc
const extractPublicId = (url: string): string | null => {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/);
  return match ? match[1] : null;
};

export const updateCategoryImage = async (id: string, file: File) => {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado' };

  if (file.size > MAX_BYTES) return { ok: false, message: 'Máximo 7 MB' };
  if (!ALLOWED.has(file.type)) return { ok: false, message: 'Solo JPEG, PNG, WebP o AVIF' };

  try {
    // Borrar imagen anterior de Cloudinary si existe
    const existing = await prisma.category.findUnique({ where: { id }, select: { imageUrl: true } });
    if (existing?.imageUrl) {
      const publicId = extractPublicId(existing.imageUrl);
      if (publicId) await cloudinary.uploader.destroy(publicId);
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const result = await cloudinary.uploader.upload(
      `data:${file.type};base64,${base64}`,
      {
        folder: 'kyzz/categories',
        transformation: [{ width: 800, crop: 'fill', aspect_ratio: '3:4', quality: 'auto' }],
      },
    );

    await prisma.category.update({ where: { id }, data: { imageUrl: result.secure_url } });

    revalidatePath('/admin/categorias');
    revalidatePath('/');

    return { ok: true, imageUrl: result.secure_url };
  } catch (error) {
    console.error('[updateCategoryImage]', error);
    return { ok: false, message: 'Error al subir la imagen' };
  }
};
