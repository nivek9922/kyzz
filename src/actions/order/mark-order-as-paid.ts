'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export const markOrderAsPaid = async (orderId: string) => {
  const session = await auth();
  if (session?.user.role !== 'admin') {
    return { ok: false, message: 'No autorizado' };
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        isPaid:         true,
        paidAt:         new Date(),
        transactionId:  `MANUAL-${Date.now()}`,
        paymentGateway: 'manual',
      },
    });

    revalidatePath('/admin/orders');
    revalidatePath(`/orders/${orderId}`);

    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, message: 'No se pudo actualizar el pedido' };
  }
};
