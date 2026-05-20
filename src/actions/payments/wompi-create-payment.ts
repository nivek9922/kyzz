'use server';

import crypto from 'crypto';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Genera la firma de integridad requerida por el Widget de Wompi.
 * No crea ninguna transacción; el widget se encarga de eso en el cliente.
 * Fórmula: SHA256(reference + amountInCents + "COP" + WOMPI_INTEGRITY_SECRET)
 */
export const wompiCreatePayment = async (orderId: string, amountInCents: number) => {
  // Máx. 10 firmas por minuto por orden — frena spam de generación de hashes.
  if (!rateLimit(`wompi:create:${orderId}`, 10, 60_000)) {
    return { ok: false as const, message: 'Demasiados intentos, espera un momento' };
  }

  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!integritySecret) {
    return { ok: false as const, message: 'Pasarela de pago no configurada' };
  }

  try {
    const order = await prisma.order.findUnique({
      where:  { id: orderId },
      select: { isPaid: true, userId: true, cancelledAt: true },
    });

    if (!order)            return { ok: false as const, message: 'Orden no encontrada' };
    if (order.isPaid)      return { ok: false as const, message: 'Esta orden ya fue pagada' };
    if (order.cancelledAt) return { ok: false as const, message: 'Esta orden fue cancelada' };

    // Órdenes de usuario: solo el propietario o admin
    if (order.userId !== null) {
      const session = await auth();
      if (
        !session?.user?.id ||
        (session.user.id !== order.userId && session.user.role !== 'admin')
      ) {
        return { ok: false as const, message: 'No autorizado' };
      }
    }

    const rawString = `${orderId}${amountInCents}COP${integritySecret}`;
    const integrity = crypto.createHash('sha256').update(rawString).digest('hex');

    return { ok: true as const, integrity };
  } catch {
    return { ok: false as const, message: 'Error al generar firma de pago' };
  }
};
