'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';


export const setTransactionId = async( orderId: string, transactionId: string ) => {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: 'No autenticado' };

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true },
    });

    if (!order) return { ok: false, message: 'Orden no encontrada' };

    if (order.userId !== session.user.id && session.user.role !== 'admin') {
      return { ok: false, message: 'No autorizado' };
    }

    await prisma.order.update({
      where: { id: orderId },
      data:  { transactionId },
    });

    return { ok: true };

  } catch {
    return {
      ok: false,
      message: 'No se pudo actualizar el id de la transacción',
    };
  }
}