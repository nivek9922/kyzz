'use server';

import { ShippingStatus } from '@prisma/client';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
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

  const REQUIRES_PAYMENT: ShippingStatus[] = ['processing', 'shipped', 'delivered'];

  if (REQUIRES_PAYMENT.includes(shippingStatus)) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { isPaid: true } });
    if (!order?.isPaid) {
      return { ok: false, message: 'El pedido debe estar pagado para avanzar a este estado.' };
    }
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingStatus,
        trackingCode:  trackingCode  ?? undefined,
        shippingNotes: shippingNotes ?? undefined,
        ...(shippingStatus === 'shipped'   ? { shippedAt:   new Date() } : {}),
        ...(shippingStatus === 'delivered' ? { deliveredAt: new Date() } : {}),
      },
    });

    // Email de "en camino" si el estado es shipped
    if (shippingStatus === 'shipped' && process.env.RESEND_API_KEY) {
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { user: { select: { email: true, name: true } } },
        });
        if (order?.user?.email) {
          const html = await render(OrderShippedEmail({
            orderId,
            firstName:    order.user.name?.split(' ')[0] ?? 'Cliente',
            trackingCode: trackingCode || undefined,
          }));
          await resend.emails.send({
            from: EMAIL_FROM,
            to:   order.user.email,
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
