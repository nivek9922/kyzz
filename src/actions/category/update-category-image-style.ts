'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export const updateCategoryImageStyle = async (id: string, lightBg: boolean) => {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado' };

  try {
    await prisma.category.update({ where: { id }, data: { imageLightBg: lightBg } });
    revalidatePath('/');
    return { ok: true };
  } catch {
    return { ok: false, message: 'Error al actualizar' };
  }
};
