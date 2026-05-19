'use server';

import prisma from '@/lib/prisma';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const subscribeNewsletter = async (email: string, name?: string) => {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName  = name?.trim() || undefined;

  if (!isValidEmail(trimmedEmail)) {
    return { ok: false, message: 'Ingresa un correo electrónico válido.' };
  }

  const existing = await prisma.subscriber.findUnique({ where: { email: trimmedEmail } });

  if (existing) {
    if (existing.unsubscribedAt) {
      await prisma.subscriber.update({
        where: { email: trimmedEmail },
        data:  { unsubscribedAt: null, isActive: true, name: trimmedName ?? existing.name },
      });
      return { ok: true, message: '¡Bienvenida de nuevo a la lista KYZZ!' };
    }
    return { ok: false, message: 'Este correo ya está suscrito.' };
  }

  await prisma.subscriber.create({
    data: {
      email:     trimmedEmail,
      name:      trimmedName,
      source:    'newsletter-popup',
      isActive:  true,
      receivedCoupon: true,
    },
  });

  return { ok: true, message: '¡Te suscribiste con éxito! Bienvenida a la lista KYZZ.' };
};
