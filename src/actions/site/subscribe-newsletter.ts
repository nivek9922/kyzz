'use server';

import prisma from '@/lib/prisma';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface NewsletterResult {
  ok:          boolean;
  message:     string;
  couponCode?: string;
  couponValue?: number;
  couponType?:  'PERCENTAGE' | 'FIXED';
}

/** Busca el cupón activo de bienvenida newsletter */
async function findWelcomeCoupon() {
  return prisma.coupon.findFirst({
    where: { campaign: 'newsletter_welcome', isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

export const subscribeNewsletter = async (
  email: string,
  name?: string,
): Promise<NewsletterResult> => {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName  = name?.trim() || undefined;

  if (!isValidEmail(trimmedEmail)) {
    return { ok: false, message: 'Ingresa un correo electrónico válido.' };
  }

  const existing = await prisma.subscriber.findUnique({
    where:   { email: trimmedEmail },
    include: { welcomeCoupon: true },
  });

  /* ── Suscriptora que se había dado de baja ─────────── */
  if (existing?.unsubscribedAt) {
    const welcomeCoupon = existing.welcomeCoupon ?? await findWelcomeCoupon();
    await prisma.subscriber.update({
      where: { email: trimmedEmail },
      data:  {
        unsubscribedAt:  null,
        isActive:        true,
        name:            trimmedName ?? existing.name,
        welcomeCouponId: welcomeCoupon?.id ?? existing.welcomeCouponId,
      },
    });
    return {
      ok:          true,
      message:     '¡Bienvenida de nuevo a la lista KYZZ!',
      couponCode:  welcomeCoupon?.code,
      couponValue: welcomeCoupon?.value,
      couponType:  welcomeCoupon?.type,
    };
  }

  /* ── Ya suscrita y activa ──────────────────────────── */
  if (existing) {
    const welcomeCoupon = existing.welcomeCoupon ?? await findWelcomeCoupon();
    return {
      ok:          false,
      message:     'Este correo ya está suscrito.',
      couponCode:  welcomeCoupon?.code,
      couponValue: welcomeCoupon?.value,
      couponType:  welcomeCoupon?.type,
    };
  }

  /* ── Nueva suscriptora ────────────────────────────── */
  const welcomeCoupon = await findWelcomeCoupon();
  await prisma.subscriber.create({
    data: {
      email:           trimmedEmail,
      name:            trimmedName,
      source:          'newsletter-popup',
      isActive:        true,
      receivedCoupon:  !!welcomeCoupon,
      welcomeCouponId: welcomeCoupon?.id ?? null,
    },
  });

  return {
    ok:          true,
    message:     '¡Te suscribiste con éxito! Bienvenida a la lista KYZZ.',
    couponCode:  welcomeCoupon?.code,
    couponValue: welcomeCoupon?.value,
    couponType:  welcomeCoupon?.type,
  };
};
