'use server';

import { z } from 'zod';
import { updateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

/** Invalida la PDP cacheada del producto (el bloque cachea también las reviews). */
async function revalidateProductPage(productId: string) {
  const product = await prisma.product.findUnique({
    where:  { id: productId },
    select: { slug: true },
  });
  if (product) updateTag(`product:${product.slug}`);
}

const schema = z.object({
  productId: z.string().uuid(),
  rating:    z.number().int().min(1).max(5),
  comment:   z.string().max(600).optional(),
});

export async function createOrUpdateReview(input: {
  productId: string;
  rating:    number;
  comment?:  string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: 'Debes iniciar sesión para dejar una reseña.' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Datos inválidos.' };

  const { productId, rating, comment } = parsed.data;

  // Verificar que el usuario haya comprado el producto
  const purchase = await prisma.orderItem.findFirst({
    where: { productId, order: { userId: session.user.id, isPaid: true } },
  });
  if (!purchase) return { ok: false, message: 'Solo puedes reseñar productos que hayas comprado.' };

  await prisma.review.upsert({
    where:  { userId_productId: { userId: session.user.id, productId } },
    create: { userId: session.user.id, productId, rating, comment: comment ?? null },
    update: { rating, comment: comment ?? null },
  });

  await revalidateProductPage(productId);
  return { ok: true };
}

export async function deleteReview(reviewId: string) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) return { ok: false };

  const isOwner = review.userId === session.user.id;
  const isAdmin = session.user.role === 'admin';
  if (!isOwner && !isAdmin) return { ok: false, message: 'No autorizado.' };

  await prisma.review.delete({ where: { id: reviewId } });
  await revalidateProductPage(review.productId);
  return { ok: true };
}
