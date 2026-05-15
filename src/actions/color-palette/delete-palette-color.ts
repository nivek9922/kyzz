'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function deletePaletteColor(id: string) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, error: 'No autorizado' };

  try {
    await prisma.colorPalette.delete({ where: { id } });
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se puede eliminar: hay productos usando este color' };
  }
}
