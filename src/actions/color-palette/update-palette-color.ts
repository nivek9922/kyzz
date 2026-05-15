'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { updatePaletteColorSchema } from './schema';

export async function updatePaletteColor(data: z.infer<typeof updatePaletteColorSchema>) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, error: 'No autorizado' };

  const parsed = updatePaletteColorSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const { id, ...rest } = parsed.data;

  try {
    const color = await prisma.colorPalette.update({ where: { id }, data: rest });
    return { ok: true, color };
  } catch {
    return { ok: false, error: 'No se pudo actualizar el color' };
  }
}
