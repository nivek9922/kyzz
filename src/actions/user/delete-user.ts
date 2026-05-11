'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export const deleteUser = async (userId: string) => {
  const session = await auth();
  if (session?.user.role !== 'admin') {
    return { ok: false, message: 'No autorizado' };
  }

  if (session.user.id === userId) {
    return { ok: false, message: 'No puedes eliminar tu propia cuenta' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { Order: { take: 1 } },
    });

    if (!user) return { ok: false, message: 'Usuario no encontrado' };

    if (user.Order.length > 0) {
      return {
        ok: false,
        message: 'Este usuario tiene pedidos y no puede eliminarse',
      };
    }

    // Eliminar dirección si existe
    await prisma.userAddress.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });

    revalidatePath('/admin/users');

    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, message: 'Error al eliminar el usuario' };
  }
};
