'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { v2 as cloudinary } from 'cloudinary';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB — límite seguro bajo el tope de Vercel (4.5 MB)

cloudinary.config(process.env.CLOUDINARY_URL ?? '');

export const updateSiteConfig = async (formData: FormData) => {
  const session = await auth();
  if (session?.user.role !== 'admin') {
    return { ok: false, message: 'No autorizado' };
  }

  try {
    const heroTitle    = formData.get('heroTitle') as string;
    const heroSubtitle = formData.get('heroSubtitle') as string;
    const heroCta      = formData.get('heroCta') as string;
    const heroImage    = formData.get('heroImage') as File | null;
    const currentUrl   = formData.get('currentHeroImageUrl') as string | null;

    let heroImageUrl = currentUrl ?? null;

    if (heroImage && heroImage.size > 0) {
      if (heroImage.size > MAX_IMAGE_BYTES) {
        return {
          ok: false,
          message: `La imagen pesa ${(heroImage.size / 1024 / 1024).toFixed(1)} MB. El máximo permitido es 4 MB.`,
        };
      }

      const mimeType = heroImage.type;
      const buffer   = await heroImage.arrayBuffer();
      const base64   = Buffer.from(buffer).toString('base64');

      console.log(`[updateSiteConfig] Subiendo imagen hero: ${heroImage.name}, ${(heroImage.size / 1024).toFixed(0)} KB, ${mimeType}`);

      const result = await cloudinary.uploader.upload(
        `data:${mimeType};base64,${base64}`,
        { folder: 'kyzz/hero', transformation: [{ width: 2560, quality: 'auto' }] }
      );
      heroImageUrl = result.secure_url;
      console.log(`[updateSiteConfig] Imagen subida OK: ${result.public_id}`);
    }

    await prisma.siteConfig.upsert({
      where:  { id: 'main' },
      update: { heroTitle, heroSubtitle, heroCta, heroImageUrl },
      create: { id: 'main', heroTitle, heroSubtitle, heroCta, heroImageUrl },
    });

    revalidatePath('/');
    return { ok: true };
  } catch (error) {
    console.error('[updateSiteConfig] Error:', error);
    return { ok: false, message: 'Error al guardar la configuración' };
  }
};
