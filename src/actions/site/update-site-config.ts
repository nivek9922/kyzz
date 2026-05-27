'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { v2 as cloudinary } from 'cloudinary';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB — límite seguro bajo el tope de Vercel (4.5 MB)

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']);

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

    const brandStoryText      = (formData.get('brandStoryText') as string | null) ?? null;
    const brandStoryImage     = formData.get('brandStoryImage') as File | null;
    const currentBrandStoryUrl = formData.get('currentBrandStoryImageUrl') as string | null;

    let heroImageUrl        = currentUrl ?? null;
    let brandStoryImageUrl  = currentBrandStoryUrl ?? null;

    const uploadImage = async (file: File, folder: string, width: number, label: string) => {
      if (file.size > MAX_IMAGE_BYTES) {
        throw Object.assign(new Error(`La imagen ${label} pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. El máximo permitido es 4 MB.`), { userFacing: true });
      }
      if (!file.type || !ALLOWED_MIME_TYPES.has(file.type)) {
        throw Object.assign(new Error('Solo se permiten imágenes JPEG, PNG, WebP o AVIF.'), { userFacing: true });
      }
      const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
      const result = await cloudinary.uploader.upload(
        `data:${file.type};base64,${base64}`,
        { folder, transformation: [{ width, quality: 'auto' }] },
      );
      return result.secure_url as string;
    };

    if (heroImage && heroImage.size > 0) {
      heroImageUrl = await uploadImage(heroImage, 'kyzz/hero', 2560, 'hero');
    }
    if (brandStoryImage && brandStoryImage.size > 0) {
      brandStoryImageUrl = await uploadImage(brandStoryImage, 'kyzz/brand-story', 1920, 'brand story');
    }

    // Read existing video fields so the text/image save doesn't wipe them
    const existing = await prisma.siteConfig.findUnique({
      where: { id: 'main' },
      select: { heroVideoUrl: true, heroPosterUrl: true },
    });

    await prisma.siteConfig.upsert({
      where:  { id: 'main' },
      update: { heroTitle, heroSubtitle, heroCta, heroImageUrl, brandStoryText, brandStoryImageUrl },
      create: {
        id: 'main', heroTitle, heroSubtitle, heroCta, heroImageUrl,
        heroVideoUrl:       existing?.heroVideoUrl  ?? null,
        heroPosterUrl:      existing?.heroPosterUrl ?? null,
        brandStoryText:     brandStoryText          ?? null,
        brandStoryImageUrl: brandStoryImageUrl      ?? null,
      },
    });

    revalidatePath('/');
    return { ok: true };
  } catch (error) {
    const e = error as Error & { userFacing?: boolean };
    if (e.userFacing) return { ok: false, message: e.message };
    console.error('[updateSiteConfig] Error:', error);
    return { ok: false, message: 'Error al guardar la configuración' };
  }
};
