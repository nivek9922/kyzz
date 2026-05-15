'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { createPaletteColorSchema } from './schema';

export async function createPaletteColor(data: z.infer<typeof createPaletteColorSchema>) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, error: 'No autorizado' };

  const parsed = createPaletteColorSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  try {
    const color = await prisma.colorPalette.create({ data: parsed.data });
    return { ok: true, color };
  } catch {
    return { ok: false, error: 'El nombre ya existe en la paleta' };
  }
}
