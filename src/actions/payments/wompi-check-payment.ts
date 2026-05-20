'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { render } from '@react-email/components';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { OrderConfirmationEmail } from '@/emails/OrderConfirmationEmail';
import type { WompiTransactionResponse } from '@/interfaces';
import { logger } from '@/lib/logger';

const WOMPI_BASE = process.env.WOMPI_BASE_URL ?? 'https://sandbox.wompi.co/v1';

/**
 * Fetch a la API de Wompi con reintentos en errores transitorios (red caída,
 * 5xx). Backoff exponencial: 300ms, 800ms. 4xx no se reintentan — son errores
 * de cliente que no van a mejorar con otro intento.
 */
async function fetchWompi(url: string, init: RequestInit): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(url, init);
      if (resp.status < 500) return resp;
      lastErr = new Error(`HTTP ${resp.status}`);
    } catch (err) {
      lastErr = err;
    }
    if (attempt < 2) await new Promise(r => setTimeout(r, 300 + attempt * 500));
  }
  throw lastErr instanceof Error ? lastErr : new Error('Wompi fetch failed');
}

/**
 * Verifica una transacción de Wompi contra la API y, si está APPROVED,
 * marca la orden como pagada. Idempotente: si ya está pagada retorna ok: true.
 */
export const wompiCheckPayment = async (wompiTransactionId: string, orderId: string) => {
  try {
    const resp = await fetchWompi(`${WOMPI_BASE}/transactions/${wompiTransactionId}`, {
      headers: { Authorization: `Bearer ${process.env.WOMPI_PRIVATE_KEY}` },
      cache:   'no-store',
    });

    if (!resp.ok) {
      logger.error({ wompiTransactionId, status: resp.status }, 'Wompi API error');
      return { ok: false, message: 'Error al consultar Wompi' };
    }

    const { data: tx }: { data: WompiTransactionResponse } = await resp.json();

    if (tx.reference !== orderId) {
      return { ok: false, message: 'La referencia de la transacción no coincide' };
    }

    if (tx.status !== 'APPROVED') {
      return { ok: false, message: `Estado del pago: ${tx.status}` };
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { ok: false, message: 'Orden no encontrada' };
    if (order.isPaid) return { ok: true }; // idempotente

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        isPaid:         true,
        paidAt:         new Date(),
        transactionId:  tx.id,
        paymentGateway: 'wompi',
        shippingStatus: 'processing',
      },
      include: {
        user:         { select: { email: true, name: true } },
        OrderItem:    { include: { product: { select: { title: true } } } },
        OrderAddress: true,
      },
    });

    try {
      const { user, OrderItem, OrderAddress } = updatedOrder;
      const recipientEmail = user?.email ?? updatedOrder.guestEmail;
      const recipientName  = user?.name?.split(' ')[0] ?? OrderAddress?.firstName ?? 'Cliente';

      if (recipientEmail && process.env.RESEND_API_KEY) {
        const html = await render(OrderConfirmationEmail({
          orderId,
          firstName: recipientName,
          items:     OrderItem.map(i => ({
            title:    i.product.title,
            size:     i.size,
            quantity: i.quantity,
            price:    i.price,
          })),
          subtotal: updatedOrder.subTotal,
          tax:      updatedOrder.tax,
          total:    updatedOrder.total,
          address:  OrderAddress?.address ?? '',
          city:     OrderAddress?.city    ?? '',
        }));
        await resend.emails.send({
          from:    EMAIL_FROM,
          to:      recipientEmail,
          subject: `KYZZ · Pago confirmado #${orderId.split('-').at(-1)?.toUpperCase()}`,
          html,
        });
      }
    } catch (emailErr) {
      logger.error({ orderId, error: String(emailErr) }, 'Wompi: error enviando email de confirmación');
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    logger.error({ wompiTransactionId, orderId, error: String(err) }, 'wompiCheckPayment error');
    return { ok: false, message: 'Error interno al verificar el pago' };
  }
};
