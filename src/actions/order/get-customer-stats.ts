'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

interface Params {
  userId?:        string | null;
  email?:         string | null;
  excludeOrderId: string;
}

export interface CustomerStats {
  orderCount:  number;
  paidCount:   number;
  totalSpent:  number;
  isReturning: boolean;
}

/**
 * Métricas CRM del cliente de una orden: nº de órdenes, órdenes pagadas, LTV
 * (suma de órdenes pagadas) y si es recurrente (tiene otra orden pagada previa).
 * Identifica al cliente por userId (registrado) o guestEmail (invitado).
 */
export const getCustomerStats = async ({ userId, email, excludeOrderId }: Params): Promise<CustomerStats | null> => {
  const session = await auth();
  if (session?.user.role !== 'admin') return null;

  const where: Prisma.OrderWhereInput | null = userId
    ? { userId }
    : email
      ? { guestEmail: email }
      : null;

  if (!where) return { orderCount: 0, paidCount: 0, totalSpent: 0, isReturning: false };

  const [orderCount, paidAgg, paidCount, otherPaid] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.aggregate({ where: { ...where, isPaid: true }, _sum: { total: true } }),
    prisma.order.count({ where: { ...where, isPaid: true } }),
    prisma.order.count({ where: { ...where, isPaid: true, id: { not: excludeOrderId } } }),
  ]);

  return {
    orderCount,
    paidCount,
    totalSpent:  paidAgg._sum.total ?? 0,
    isReturning: otherPaid > 0,
  };
};
