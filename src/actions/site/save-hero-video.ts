'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export const saveHeroVideo = async (
  heroVideoUrl:  string | null,
  heroPosterUrl: string | null,
) => {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado' };

  try {
    // Intentar update primero; si no existe el registro, crearlo con defaults.
    const existing = await prisma.siteConfig.findUnique({ where: { id: 'main' } });

    if (existing) {
      await prisma.siteConfig.update({
        where: { id: 'main' },
        data:  { heroVideoUrl, heroPosterUrl },
      });
    } else {
      await prisma.siteConfig.create({
        data: {
          id:           'main',
          heroTitle:    'Kyzz: Basics for every you',
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
