'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

const schema = z.object({
  name: z.string().min(1).max(60),
  hex:  z.string().regex(/^#[0-9a-fA-F]{6}$/),
  sortOrder: z.number().int().default(0),
});

export async function createPaletteColor(data: z.infer<typeof schema>) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, error: 'No autorizado' };

  const parsed = schema.safeParse(data);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  try {
    const color = await prisma.colorPalette.create({ data: parsed.data });
    return { ok: true, color };
  } catch {
    return { ok: false, error: 'El nombre ya existe en la paleta' };
  }
}
