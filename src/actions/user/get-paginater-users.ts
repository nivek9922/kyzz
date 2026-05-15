'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

interface Options {
  page?:  number;
  take?:  number;
  query?: string;
}

export const getPaginatedUsers = async ({ page = 1, take = 15, query }: Options = {}) => {
  const session = await auth();
  if (session?.user.role !== 'admin') {
    return { ok: false, message: 'Debe ser administrador' };
  }

  const where = query?.trim()
    ? {
        OR: [
          { name:  { contains: query, mode: 'insensitive' as const } },
          { email: { contains: query, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, image: true },
      orderBy: { name: 'asc' },
      skip:    (page - 1) * take,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    ok:         true,
    users,
    totalPages: Math.ceil(total / take),
    total,
  };
};
