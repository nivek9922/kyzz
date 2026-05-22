'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { render } from '@react-email/components';
import { AbandonedCartEmail } from '@/emails/AbandonedCartEmail';

const EXPIRY_HOURS = 24;

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
  return prisma.order.count({
    where: { isPaid: false, cancelledAt: null, createdAt: { lt: expiryDate } },
  });
};

/** Lógica central — usada por la action admin y por el cron route */
export async function runCancelUnpaidOrders(): Promise<{ ok: boolean; cancelledCount?: number; message?: string }> {
  const expiryDate = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000);

  try {
    const expiredOrders = await prisma.order.findMany({
      where: { isPaid: false, cancelledAt: null, createdAt: { lt: expiryDate } },
      include: {
        OrderItem: {
          select: { productId: true, quantity: true, variantId: true },
        },
      },
    });

    if (expiredOrders.length === 0) return { ok: true, cancelledCount: 0 };

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Acumular incrementos por variante y productos afectados
      const variantIncrements = new Map<string, number>();
      const affectedProductIds = new Set<string>();

      for (const order of expiredOrders) {
        for (const item of order.OrderItem) {
          affectedProductIds.add(item.productId);
          if (item.variantId) {
            variantIncrements.set(
              item.variantId,
              (variantIncrements.get(item.variantId) ?? 0) + item.quantity,
            );
          }
        }
      }

      // 1. Restaurar stock en cada variante afectada
      if (variantIncrements.size > 0) {
        await Promise.all(
          Array.from(variantIncrements.entries()).map(([variantId, qty]) =>
            tx.productVariant.update({
              where: { id: variantId },
              data:  { stock: { increment: qty } },
            }),
          ),
        );

        // 2. Resincronizar Product.inStock desde suma de variantes (mismo patrón que place-order)
        await Promise.all(
          Array.from(affectedProductIds).map(async (pid) => {
            const agg = await tx.productVariant.aggregate({
              where: { productId: pid },
              _sum:  { stock: true },
            });
            return tx.product.update({
              where: { id: pid },
              data:  { inStock: agg._sum.stock ?? 0 },
            });
          }),
        );
      }

      // 3. Marcar órdenes como canceladas
      await tx.order.updateMany({
        where: { id: { in: expiredOrders.map((o) => o.id) } },
        data:  { cancelledAt: new Date() },
      });
    });

    // Invalidar caché de PDP para todos los productos con stock restaurado
    const affectedProductIds = new Set(expiredOrders.flatMap((o) => o.OrderItem.map((i) => i.productId)));
    if (affectedProductIds.size > 0) {
      const products = await prisma.product.findMany({
        where:  { id: { in: Array.from(affectedProductIds) } },
        select: { slug: true },
      });
      products.forEach((p) => revalidateTag(`product:${p.slug}`));
    }

    // 4. Enviar emails de recuperación de carrito abandonado (>3h, sin email enviado aún)
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
