'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export const getRedemptions = async (couponId?: string) => {
  const session = await auth();
  if (session?.user?.role !== 'admin') return [];

  return prisma.couponRedemption.findMany({
    where:   couponId ? { couponId } : undefined,
    include: {
      coupon: { select: { code: true, type: true, value: true } },
      order:  { select: { id: true, total: true, couponDiscount: true, isPaid: true, createdAt: true } },
    },
    orderBy: { redeemedAt: 'desc' },
    take:    200,
  });
};
