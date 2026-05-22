'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export interface ProductReview {
  id:        string;
  rating:    number;
  comment:   string | null;
  createdAt: Date;
  userName:  string;
}

export interface ReviewSummary {
  average: number;
  count:   number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export async function getProductReviews(productId: string): Promise<{
  reviews: ProductReview[];
  summary: ReviewSummary;
  userReview: { id: string; rating: number; comment: string | null } | null;
  hasPurchased: boolean;
}> {
  const session = await auth();
  const userId  = session?.user?.id;

  const reviews = await prisma.review.findMany({
    where:   { productId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take:    50,
  });

  const summary: ReviewSummary = {
    average:      reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0,
    count:        reviews.length,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
  reviews.forEach((r) => { summary.distribution[r.rating as 1 | 2 | 3 | 4 | 5]++; });

  const userReview = userId
    ? reviews.find((r) => r.userId === userId) ?? null
    : null;

  // Verificar si el usuario tiene una orden pagada con este producto
  let hasPurchased = false;
  if (userId) {
    const purchase = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, isPaid: true },
      },
    });
    hasPurchased = !!purchase;
  }

  return {
    reviews: reviews.map((r) => ({
      id:        r.id,
      rating:    r.rating,
      comment:   r.comment,
      createdAt: r.createdAt,
      userName:  r.user.name,
    })),
    summary,
    userReview: userReview
      ? { id: userReview.id, rating: userReview.rating, comment: userReview.comment }
      : null,
    hasPurchased,
  };
}
