'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export const getCoupons = async () => {
  const session = await auth();
  if (session?.user?.role !== 'admin') return [];

  return prisma.coupon.findMany({
    include: { _count: { select: { redemptions: true } } },
    orderBy: { createdAt: 'desc' },
  });
};
