'use server';

import prisma from '@/lib/prisma';

export async function getColorPalette() {
  return prisma.colorPalette.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}
