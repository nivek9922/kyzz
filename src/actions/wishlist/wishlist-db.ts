'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

/** productIds en la wishlist del usuario logueado (vacío si es invitado). */
export const getWishlistIds = async (): Promise<string[]> => {
  const session = await auth();
  if (!session?.user?.id) return [];

  const items = await prisma.wishlistItem.findMany({
    where:  { userId: session.user.id },
    select: { productId: true },
  });
  return items.map((i) => i.productId);
};

/** Agrega o quita un producto de la wishlist del usuario logueado. */
export const setWishlistItem = async (productId: string, add: boolean): Promise<{ ok: boolean }> => {
  const session = await auth();
  const userId  = session?.user?.id;
  if (!userId) return { ok: false };

  try {
    if (add) {
      await prisma.wishlistItem.upsert({
        where:  { userId_productId: { userId, productId } },
        update: {},
        create: { userId, productId },
      });
    } else {
      await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
};

/** Merge: agrega varios productos a la wishlist (al loguearse, sube los locales). */
export const addManyWishlist = async (productIds: string[]): Promise<{ ok: boolean }> => {
  const session = await auth();
  const userId  = session?.user?.id;
  if (!userId || productIds.length === 0) return { ok: false };

  try {
    // Filtra a productos existentes para evitar errores de FK por IDs obsoletos del local.
    const existing = await prisma.product.findMany({
      where:  { id: { in: productIds } },
      select: { id: true },
    });
    if (existing.length === 0) return { ok: true };

    await prisma.wishlistItem.createMany({
      data: existing.map((p) => ({ userId, productId: p.id })),
      skipDuplicates: true,
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
};
