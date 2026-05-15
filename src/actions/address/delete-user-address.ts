'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';


export const deleteUserAddress = async() => {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: 'No autenticado' };

  try {
    await prisma.userAddress.deleteMany({
      where: { userId: session.user.id },
    });

    return { ok: true };

  } catch {
    return {
      ok: false,
      message: 'No se pudo eliminar la direccion',
    };
  }
}