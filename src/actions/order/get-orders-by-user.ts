'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export const getOrdersByUser = async () => {
  const session = await auth();

  if (!session?.user) {
    return { ok: false, message: 'Debe de estar autenticado' };
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      OrderAddress: {
        select: { firstName: true, lastName: true },
      },
      OrderItem: {
        take: 3,
        select: {
          quantity: true,
          product: {
            select: {
              title: true,
              ProductImage: { take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  });

  return { ok: true, orders };
};
