'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// Threshold en horas para considerar una orden como expirada
const EXPIRY_HOURS = 24;

export const cancelUnpaidOrders = async () => {
  const session = await auth();
  if (session?.user.role !== 'admin') {
    return { ok: false, message: 'No autorizado' };
  }

  const expiryDate = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000);

  try {
    const expiredOrders = await prisma.order.findMany({
      where: {
        isPaid: false,
        cancelledAt: null,
        createdAt: { lt: expiryDate },
      },
      include: {
        OrderItem: {
          select: { productId: true, quantity: true },
        },
      },
    });

    if (expiredOrders.length === 0) {
      return { ok: true, cancelledCount: 0 };
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Restaurar stock de cada orden
      for (const order of expiredOrders) {
        for (const item of order.OrderItem) {
          await tx.product.update({
            where: { id: item.productId },
            data: { inStock: { increment: item.quantity } },
          });
        }
      }

      // Marcar todas como canceladas
      await tx.order.updateMany({
        where: { id: { in: expiredOrders.map((o: { id: string }) => o.id) } },
        data: { cancelledAt: new Date() },
      });
    });

    revalidatePath('/admin/orders');

    return { ok: true, cancelledCount: expiredOrders.length };
  } catch (error) {
    console.error(error);
    return { ok: false, message: 'Error al cancelar las órdenes' };
  }
};

export const getCancellableOrdersCount = async (): Promise<number> => {
  const expiryDate = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000);
  return prisma.order.count({
    where: {
      isPaid: false,
      cancelledAt: null,
      createdAt: { lt: expiryDate },
    },
  });
};
