'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config(process.env.CLOUDINARY_URL ?? '');

// Extrae public_id desde URL de Cloudinary para borrado.
// Ej: https://res.cloudinary.com/x/video/upload/v123/kyzz/hero-video/abc.mp4 → kyzz/hero-video/abc
const extractPublicId = (url: string): string | null => {
  const match = url.match(/\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+(?:\?.*)?$/);
  return match ? match[1] : null;
};

export const saveHeroVideo = async (
  heroVideoUrl:  string | null,
  heroPosterUrl: string | null,
) => {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado' };

  try {
    const existing = await prisma.siteConfig.findUnique({ where: { id: 'main' } });

    // Borrar video anterior de Cloudinary si cambió o si se está limpiando.
    // El poster es una transformación derivada del video, así que solo se borra el recurso video.
    if (existing?.heroVideoUrl && existing.heroVideoUrl !== heroVideoUrl) {
      const publicId = extractPublicId(existing.heroVideoUrl);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
        } catch (e) {
          console.error('[saveHeroVideo] No se pudo borrar video anterior en Cloudinary', e);
        }
      }
    }

    if (existing) {
      await prisma.siteConfig.update({
        where: { id: 'main' },
        data:  { heroVideoUrl, heroPosterUrl },
      });
    } else {
      await prisma.siteConfig.create({
        data: {
          id:           'main',
          heroTitle:    'Kyzz: Tu estilo, tu esencia',
          heroSubtitle: 'Nueva colección',
          heroCta:      'Explorar colección',
          heroVideoUrl,
          heroPosterUrl,
        },
      });
    }

    revalidatePath('/');
    return { ok: true };
  } catch (error) {
    console.error('[saveHeroVideo]', error);
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return { ok: false, message: msg };
  }
};
