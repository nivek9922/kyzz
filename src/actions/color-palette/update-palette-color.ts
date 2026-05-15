'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

const schema = z.object({
  id:        z.string().uuid(),
  name:      z.string().min(1).max(60),
  hex:       z.string().regex(/^#[0-9a-fA-F]{6}$/),
  sortOrder: z.number().int().default(0),
});

export async function updatePaletteColor(data: z.infer<typeof schema>) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, error: 'No autorizado' };

  const parsed = schema.safeParse(data);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const { id, ...rest } = parsed.data;

  try {
    const color = await prisma.colorPalette.update({ where: { id }, data: rest });
    return { ok: true, color };
  } catch {
    return { ok: false, error: 'No se pudo actualizar el color' };
  }
}
