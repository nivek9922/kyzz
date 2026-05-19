'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { currencyFormat } from '@/utils';

export interface ValidatedCoupon {
  code:     string;
  type:     'PERCENTAGE' | 'FIXED';
  value:    number;
  discount: number;
}

export const validateCoupon = async (code: string, subtotal: number) => {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, message: 'Debes iniciar sesión para aplicar un cupón.' };
  }

  const email = session.user.email.toLowerCase();
  const upperCode = code.trim().toUpperCase();

  const coupon = await prisma.coupon.findUnique({ where: { code: upperCode } });

  if (!coupon || !coupon.isActive) {
    return { ok: false, message: 'Cupón no válido.' };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { ok: false, message: 'Este cupón ha expirado.' };
  }
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return { ok: false, message: 'Este cupón ya no está disponible.' };
  }
  if (coupon.minimumAmount !== null && subtotal < coupon.minimumAmount) {
    return {
      ok: false,
      message: `El subtotal mínimo para este cupón es ${currencyFormat(coupon.minimumAmount)}.`,
    };
  }

  // Cupones exclusivos para suscriptoras
  if (coupon.subscriberOnly) {
    const subscriber = await prisma.subscriber.findUnique({ where: { email } });
    if (!subscriber?.isActive) {
      return {
        ok: false,
        message: 'Este cupón es exclusivo para suscriptoras del newsletter KYZZ.',
      };
    }
  }

  // Verificar si ya fue usado por este email
  const used = await prisma.couponRedemption.findUnique({
    where: { couponId_email: { couponId: coupon.id, email } },
  });
  if (used?.orderId) {
    return { ok: false, message: 'Ya usaste este cupón anteriormente.' };
  }

  const discount =
    coupon.type === 'PERCENTAGE'
      ? Math.round(subtotal * (coupon.value / 100))
      : Math.min(coupon.value, subtotal);

  return {
    ok: true,
    coupon: {
      code:     coupon.code,
      type:     coupon.type,
      value:    coupon.value,
      discount,
    } satisfies ValidatedCoupon,
  };
};
