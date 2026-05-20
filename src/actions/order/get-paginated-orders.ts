'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

interface Options {
  page?:  number;
  take?:  number;
  query?: string;
}

export const getPaginatedOrders = async ({ page = 1, take = 15, query }: Options = {}) => {
  const session = await auth();
  if (session?.user.role !== 'admin') {
    return { ok: false, message: 'Debe estar autenticado' };
  }

  const where = query?.trim()
    ? {
        OR: [
          { id:         { contains: query, mode: 'insensitive' as const } },
          { user:       { email: { contains: query, mode: 'insensitive' as const } } },
          { guestEmail: { contains: query, mode: 'insensitive' as const } },
          { OrderAddress: { firstName: { contains: query, mode: 'insensitive' as const } } },
          { OrderAddress: { lastName:  { contains: query, mode: 'insensitive' as const } } },
        ],
      }
    : {};

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * take,
      take,
      include: {
        OrderAddress: { select: { firstName: true, lastName: true } },
        user:         { select: { email: true } },
        _count:       { select: { OrderItem: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    ok:         true,
    orders,
    totalPages: Math.ceil(total / take),
    total,
  };
};
