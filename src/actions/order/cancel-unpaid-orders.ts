'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { releaseStock } from '@/lib/stock-ops';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { render } from '@react-email/components';
import { AbandonedCartEmail } from '@/emails/AbandonedCartEmail';

const EXPIRY_HOURS = 24;

// Filas de orden con sus items, tal como las consultamos para cancelar y liberar.
type ExpiredOrder = {
  id: string;
  OrderItem: { productId: string; quantity: number; variantId: string | null }[];
};

export const cancelUnpaidOrders = async () => {
  const session = await auth();
  if (session?.user.role !== 'admin') {
    return { ok: false, message: 'No autorizado' };
  }

  const result = await runCancelUnpaidOrders();
  if (result.ok) revalidatePath('/admin/orders');
  return result;
};

export const getCancellableOrdersCount = async (): Promise<number> => {
  const expiryDate = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000);
  // Solo prepaid no pagados: los COD no se cancelan por antigüedad (su reserva
  // expira por reservationExpiresAt solo si no se confirman).
  return prisma.order.count({
    where: { isPaid: false, paymentMethod: 'prepaid', cancelledAt: null, createdAt: { lt: expiryDate } },
  });
};

/** Lógica central — usada por la action admin y por el cron route */
export async function runCancelUnpaidOrders(): Promise<{ ok: boolean; cancelledCount?: number; message?: string }> {
  const now        = new Date();
  const expiryDate = new Date(now.getTime() - EXPIRY_HOURS * 60 * 60 * 1000);

  const ORDER_SELECT = {
    OrderItem: { select: { productId: true, quantity: true, variantId: true } },
  } as const;

  try {
    // 1. Prepaid no pagados con >24h de antigüedad.
    const prepaidExpired = await prisma.order.findMany({
      where:   { isPaid: false, paymentMethod: 'prepaid', cancelledAt: null, createdAt: { lt: expiryDate } },
      include: ORDER_SELECT,
    });

    // 2. COD sin confirmar cuya ventana de reserva ya venció (siguen en pending,
    //    no se han despachado, así que su stock sigue reservado, no comprometido).
    const codExpired = await prisma.order.findMany({
      where: {
        paymentMethod:        'cod',
        isPaid:               false,
        cancelledAt:          null,
        codConfirmedAt:       null,
        shippingStatus:       'pending',
        reservationExpiresAt: { lt: now },
      },
      include: ORDER_SELECT,
    });

    const expiredOrders: ExpiredOrder[] = [...prepaidExpired, ...codExpired];
    if (expiredOrders.length === 0) return { ok: true, cancelledCount: 0 };

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Liberar la reserva (reserved -= qty); el stock físico no se toca.
      const items = expiredOrders.flatMap((o) =>
        o.OrderItem
          .filter((i): i is typeof i & { variantId: string } => i.variantId !== null)
          .map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      );
      await releaseStock(tx, items);

      await tx.order.updateMany({
        where: { id: { in: expiredOrders.map((o) => o.id) } },
        data:  { cancelledAt: now },
      });
    });

    // Invalidar caché de PDP para todos los productos con disponibilidad restaurada
    const affectedProductIds = new Set(expiredOrders.flatMap((o) => o.OrderItem.map((i) => i.productId)));
    if (affectedProductIds.size > 0) {
      const products = await prisma.product.findMany({
        where:  { id: { in: Array.from(affectedProductIds) } },
        select: { slug: true },
      });
      products.forEach((p) => revalidateTag(`product:${p.slug}`));
    }

    // Emails de recuperación de carrito abandonado (>3h, sin email enviado aún)
    await sendAbandonedCartEmails();

    return { ok: true, cancelledCount: expiredOrders.length };
  } catch (error) {
    console.error('[cancelUnpaidOrders]', error);
    return { ok: false, message: 'Error al cancelar las órdenes' };
  }
}

async function sendAbandonedCartEmails() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl || !process.env.RESEND_API_KEY) return;

  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000); // > 3 horas

  try {
    const carts = await prisma.abandonedCart.findMany({
      where: { emailSentAt: null, recoveredAt: null, createdAt: { lt: cutoff } },
      take: 50,
    });

    for (const cart of carts) {
      const items = cart.items as any[];
      if (!items?.length) continue;

      const total = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
      const recoveryUrl = `${appUrl}/cart?recover=${cart.recoveryToken}`;

      const html = await render(AbandonedCartEmail({ items, recoveryUrl, total }));

      await resend.emails.send({
        from:    EMAIL_FROM,
        to:      cart.email,
        subject: 'Olvidaste algo en KYZZ',
        html,
      });

      await prisma.abandonedCart.update({
        where: { id: cart.id },
        data:  { emailSentAt: new Date() },
      });
    }
  } catch (err) {
    console.error('[sendAbandonedCartEmails]', err);
  }
}
