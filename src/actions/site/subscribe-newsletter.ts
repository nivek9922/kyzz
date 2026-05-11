'use server';

import prisma from '@/lib/prisma';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const subscribeNewsletter = async (email: string) => {
  const trimmed = email.trim().toLowerCase();

  if (!isValidEmail(trimmed)) {
    return { ok: false, message: 'Ingresa un correo electrónico válido.' };
  }

  const existing = await prisma.subscriber.findUnique({ where: { email: trimmed } });

  if (existing) {
    // Si se había dado de baja, lo reactivamos
    if (existing.unsubscribedAt) {
      await prisma.subscriber.update({
        where: { email: trimmed },
        data: { unsubscribedAt: null },
      });
      return { ok: true, message: '¡Bienvenida de nuevo a la lista KYZZ!' };
    }
    return { ok: false, message: 'Este correo ya está suscrito.' };
  }

  await prisma.subscriber.create({ data: { email: trimmed } });

  return { ok: true, message: '¡Te suscribiste con éxito! Bienvenida a la lista KYZZ.' };
};
