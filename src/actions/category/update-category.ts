'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const slugify = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export const updateCategory = async (id: string, name: string) => {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado' };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: 'El nombre es requerido' };

  const slug = slugify(trimmed);

  try {
    const category = await prisma.category.update({ where: { id }, data: { name: trimmed, slug } });
    revalidatePath('/admin/categorias');
    revalidatePath('/products');
    return { ok: true, category };
  } catch {
    return { ok: false, message: 'Ya existe una categoría con ese nombre' };
  }
};
