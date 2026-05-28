'use server';

import { ShippingStatus } from '@prisma/client';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { commitStock } from '@/lib/stock-ops';
import { revalidatePath } from 'next/cache';
import { render } from '@react-email/components';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { OrderShippedEmail } from '@/emails/OrderShippedEmail';
import { logger } from '@/lib/logger';

interface UpdateShippingInput {
  orderId:        string;
  shippingStatus: ShippingStatus;
  trackingCode?:  string;
  shippingNotes?: string;
}

export const updateOrderShipping = async ({
  orderId,
  shippingStatus,
  trackingCode,
  shippingNotes,
}: UpdateShippingInput) => {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado' };

  const order = await prisma.order.findUnique({
    where:  { id: orderId },
    select: {
      isPaid:         true,
      paymentMethod:  true,
      shippingStatus: true,
      OrderItem:      { select: { productId: true, quantity: true, variantId: true } },
    },
  });
  if (!order) return { ok: false, message: 'Orden no encontrada' };

  // Gate de pago: prepaid exige pago para avanzar; COD puede avanzar sin pagar
  // (el cobro ocurre en la entrega).
  const REQUIRES_PAYMENT: ShippingStatus[] = ['processing', 'shipped', 'delivered'];
  if (order.paymentMethod === 'prepaid' && REQUIRES_PAYMENT.includes(shippingStatus) && !order.isPaid) {
    return { ok: false, message: 'El pedido debe estar pagado para avanzar a este estado.' };
  }

  // La mercancía sale de bodega al pasar a fulfillment (shipped/delivered).
  // Commitea una sola vez, sea cual sea la ruta (shipped→delivered o salto directo).
  const FULFILLED: ShippingStatus[] = ['shipped', 'delivered'];
  const shouldCommit = !FULFILLED.includes(order.shippingStatus) && FULFILLED.includes(shippingStatus);

  // COD: al marcar entregado se registra el cobro en efectivo.
  const codCashCollected = shippingStatus === 'delivered' && order.paymentMethod === 'cod' && !order.isPaid;

  try {
    await prisma.$transaction(async (tx) => {
      if (shouldCommit) {
        const items = order.OrderItem
          .filter((i): i is typeof i & { variantId: string } => i.variantId !== null)
          .map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
        await commitStock(tx, items);
      }
      await tx.order.update({
        where: { id: orderId },
        data: {
          shippingStatus,
          trackingCode:  trackingCode  ?? undefined,
          shippingNotes: shippingNotes ?? undefined,
          ...(shippingStatus === 'shipped'   ? { shippedAt:   new Date() } : {}),
          ...(shippingStatus === 'delivered' ? { deliveredAt: new Date() } : {}),
          ...(codCashCollected ? { isPaid: true, paidAt: new Date(), paymentGateway: 'cash' as const } : {}),
        },
      });
    });

    // Email de "en camino" si el estado es shipped
    if (shippingStatus === 'shipped' && process.env.RESEND_API_KEY) {
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            user:         { select: { email: true, name: true } },
            OrderAddress: { select: { firstName: true } },
          },
        });
        const recipientEmail = order?.user?.email ?? order?.guestEmail;
        const recipientName  = order?.user?.name?.split(' ')[0] ?? order?.OrderAddress?.firstName ?? 'Cliente';
        if (recipientEmail) {
          const html = await render(OrderShippedEmail({
            orderId,
            firstName:    recipientName,
            trackingCode: trackingCode || undefined,
          }));
          await resend.emails.send({
            from: EMAIL_FROM,
            to:   recipientEmail,
            subject: `KYZZ · Tu pedido #${orderId.split('-').at(-1)?.toUpperCase()} está en camino`,
            html,
          });
        }
      } catch (emailErr) {
        logger.error({ orderId, error: String(emailErr) }, 'Error enviando email de envío');
      }
    }

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders');
    revalidatePath(`/orders/${orderId}`);
    return { ok: true };
  } catch {
    return { ok: false, message: 'Error al actualizar el estado de envío' };
  }
};

/**
 * Confirma un pedido contraentrega (anti-fraude). Detiene la expiración de la
 * reserva y lo pasa a "procesando". Solo admin.
 */
export const confirmCodOrder = async (orderId: string) => {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado' };

  const order = await prisma.order.findUnique({
    where:  { id: orderId },
    select: { paymentMethod: true, cancelledAt: true },
  });
  if (!order) return { ok: false, message: 'Orden no encontrada' };
  if (order.paymentMethod !== 'cod') return { ok: false, message: 'Solo aplica a pedidos contraentrega.' };
  if (order.cancelledAt) return { ok: false, message: 'La orden está cancelada.' };

  await prisma.order.update({
    where: { id: orderId },
    data:  { codConfirmedAt: new Date(), reservationExpiresAt: null, shippingStatus: 'processing' },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
};
