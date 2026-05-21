import { NextRequest } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import type { WompiWebhookBody } from '@/interfaces';

/**
 * POST /api/wompi/webhook
 *
 * Recibe eventos de Wompi. Verifica la firma y procesa `transaction.updated`.
 * Wompi envía el evento incluso si el cliente ya confirmó el pago via widget
 * o via redirect, por lo que el handler es idempotente.
 *
 * Setup en Wompi Dashboard → Desarrollo → Eventos → URL del webhook:
 *   Producción: https://kyzz.co/api/wompi/webhook
 *   Dev/ngrok:  https://<sub>.ngrok-free.app/api/wompi/webhook
 *
 * El "Secreto de eventos" del dashboard debe ir en .env como
 * WOMPI_EVENTS_SECRET (NO el integrity secret, son distintos).
 */
export async function POST(req: NextRequest) {
  let body: WompiWebhookBody;

  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { event, data, signature, timestamp } = body;

  // ── Verificar firma ───────────────────────────────────────────────────────────
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
  if (!eventsSecret) {
    logger.error({}, 'WOMPI_EVENTS_SECRET no configurado');
    return Response.json({ ok: false }, { status: 500 });
  }

  try {
    const propValues = signature.properties.map((prop) => {
      // Navegar el objeto data con la ruta "transaction.id", "transaction.status", etc.
      return prop.split('.').reduce(
        (obj: Record<string, unknown>, key) => obj?.[key] as Record<string, unknown>,
        data as unknown as Record<string, unknown>,
      );
    });

    const rawString = [...propValues.map(String), String(timestamp), eventsSecret].join('');
    const expected  = crypto.createHash('sha256').update(rawString).digest('hex');

    if (expected !== signature.checksum) {
      logger.warn({ event, timestamp }, 'Wompi webhook: firma inválida');
      return Response.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
    }
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  // ── Solo procesar transaction.updated ────────────────────────────────────────
  if (event !== 'transaction.updated') {
    return Response.json({ ok: true });
  }

  const tx = data.transaction;
  // La reference tiene formato "orderId-timestamp" — extraemos solo el UUID (36 chars).
  const orderId = tx.reference.substring(0, 36);
  const txId    = tx.id;
  const status  = tx.status;

  logger.info({ orderId, txId, status }, 'Wompi webhook: transaction.updated');

  try {
    if (status === 'APPROVED') {
      const order = await prisma.order.findUnique({
        where:  { id: orderId },
        select: { isPaid: true },
      });

      if (order && !order.isPaid) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            isPaid:         true,
            paidAt:         new Date(),
            transactionId:  txId,
            paymentGateway: 'wompi',
            shippingStatus: 'processing',
          },
        });

        revalidatePath(`/orders/${orderId}`);
        revalidatePath(`/admin/orders/${orderId}`);
        revalidatePath('/admin/orders');

        logger.info({ orderId, txId }, 'Wompi webhook: orden marcada como pagada');
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    logger.error({ orderId, error: String(err) }, 'Wompi webhook: error procesando transacción');
    return Response.json({ ok: false }, { status: 500 });
  }
}
