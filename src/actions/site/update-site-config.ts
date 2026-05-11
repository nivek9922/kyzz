'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config(process.env.CLOUDINARY_URL ?? '');

export const updateSiteConfig = async (formData: FormData) => {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado' };

  try {
    const heroTitle    = formData.get('heroTitle') as string;
    const heroSubtitle = formData.get('heroSubtitle') as string;
    const heroCta      = formData.get('heroCta') as string;
    const heroImage    = formData.get('heroImage') as File | null;
    const currentUrl   = formData.get('currentHeroImageUrl') as string | null;

    let heroImageUrl = currentUrl ?? null;

    if (heroImage && heroImage.size > 0) {
      const buffer  = await heroImage.arrayBuffer();
      const base64  = Buffer.from(buffer).toString('base64');
      const mimeType = heroImage.type;

      const result = await cloudinary.uploader.upload(
        `data:${mimeType};base64,${base64}`,
        { folder: 'kyzz/hero', transformation: [{ width: 2560, quality: 'auto' }] }
      );
      heroImageUrl = result.secure_url;
    }

    await prisma.siteConfig.upsert({
      where:  { id: 'main' },
      update: { heroTitle, heroSubtitle, heroCta, heroImageUrl },
      create: { id: 'main', heroTitle, heroSubtitle, heroCta, heroImageUrl },
    });

    revalidatePath('/');
    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, message: 'Error al guardar la configuración' };
  }
};
