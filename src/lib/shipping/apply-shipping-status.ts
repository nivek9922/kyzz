import { ShippingStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { commitStock } from '@/lib/stock-ops';
import { revalidatePath } from 'next/cache';
import { render } from '@react-email/components';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { OrderShippedEmail } from '@/emails/OrderShippedEmail';
import { carrierLabel, carrierTrackingUrl } from '@/lib/shipping/carriers';
import { logger } from '@/lib/logger';
import { sendTemplate } from '@/lib/whatsapp-api';
import { toE164Colombia } from '@/lib/phone';

const REQUIRES_PAYMENT: ShippingStatus[] = ['processing', 'shipped', 'delivered'];
const FULFILLED:        ShippingStatus[] = ['shipped', 'delivered'];

interface ApplyOptions {
  trackingCode?:  string;
  shippingNotes?: string;
  /**
   * Aplica el gate de pago (prepaid debe estar pagado). Cierto para acciones
   * manuales del admin; falso para eventos del transportador (la realidad física
   * manda: si la transportadora reporta "entregado", se acepta).
   */
  enforcePaymentGate?: boolean;
}

/**
 * Núcleo de transición del estado de envío de una orden. SIN auth — la
 * autorización la hace quien lo llama (updateOrderShipping del admin).
 * Centraliza el commit de stock, el cobro COD al entregar y el email de
 * despacho, para que el cambio sea consistente sin importar desde dónde se haga.
 */
export async function applyShippingTransition(
  orderId:        string,
  shippingStatus: ShippingStatus,
  opts: ApplyOptions = {},
): Promise<{ ok: boolean; message?: string }> {
  const { trackingCode, shippingNotes, enforcePaymentGate = true } = opts;

  // TODO wraps all I/O including the initial findUnique — callers get a clean
  // { ok: false } instead of an unhandled exception crashing the Server Action.
  try {
    const order = await prisma.order.findUnique({
      where:  { id: orderId },
      select: {
        isPaid:         true,
        paymentMethod:  true,
        shippingStatus: true,
        cancelledAt:    true,
        OrderItem:      { select: { productId: true, quantity: true, variantId: true } },
      },
    });
    if (!order) return { ok: false, message: 'Orden no encontrada' };
    if (order.cancelledAt) return { ok: false, message: 'La orden está cancelada.' };

    // Gate de pago (solo acciones manuales): prepaid exige pago para avanzar.
    if (enforcePaymentGate
        && order.paymentMethod === 'prepaid'
        && REQUIRES_PAYMENT.includes(shippingStatus)
        && !order.isPaid) {
      return { ok: false, message: 'El pedido debe estar pagado para avanzar a este estado.' };
    }

    const enteringFulfillment = !FULFILLED.includes(order.shippingStatus) && FULFILLED.includes(shippingStatus);
    const codCashCollected    = shippingStatus === 'delivered' && order.paymentMethod === 'cod' && !order.isPaid;

    // Campos comunes a cualquier transición (timestamps, COD, guía).
    // Se aplican en ambas ramas para que shipped→delivered registre el pago COD
    // y el deliveredAt igual que una transición directa a delivered.
    const commonFields = {
      trackingCode:  trackingCode  ?? undefined,
      shippingNotes: shippingNotes ?? undefined,
      ...(shippingStatus === 'shipped'   ? { shippedAt:   new Date() } : {}),
      ...(shippingStatus === 'delivered' ? { deliveredAt: new Date() } : {}),
      ...(codCashCollected ? { isPaid: true, paidAt: new Date(), paymentGateway: 'cash' as const } : {}),
    };

    await prisma.$transaction(async (tx) => {
      if (enteringFulfillment) {
        // Guard atómico contra doble-commit bajo concurrencia.
        // El UPDATE en updateMany adquiere el row-lock; si otra transacción
        // ya completó la transición a fulfilled, el WHERE falla (count=0) y
        // el commit de stock se omite — idempotente.
        const guard = await tx.order.updateMany({
          where: { id: orderId, shippingStatus: { notIn: FULFILLED } },
          data:  { shippingStatus },
        });

        if (guard.count === 0) return; // Ganó una transacción concurrente, no-op

        const items = order.OrderItem
          .filter((i): i is typeof i & { variantId: string } => i.variantId !== null)
          .map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
        await commitStock(tx, items);

        await tx.order.update({ where: { id: orderId }, data: commonFields });
      } else {
        // Transición dentro-fulfillment (ej: shipped→delivered) o pre-fulfillment.
        // Incluye commonFields para que el pago COD y deliveredAt siempre se registren.
        await tx.order.update({
          where: { id: orderId },
          data:  { shippingStatus, ...commonFields },
        });
      }
    });

    if (shippingStatus === 'shipped' && process.env.RESEND_API_KEY) {
      await sendShippedEmail(orderId, trackingCode);
    }

    await notifyWhatsApp(orderId, shippingStatus, trackingCode);

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders');
    revalidatePath(`/orders/${orderId}`);
    return { ok: true };
  } catch {
    return { ok: false, message: 'Error al actualizar el estado de envío' };
  }
}

/**
 * Notificación WhatsApp proactiva al cliente en estados clave del pedido.
 * Es no-op si WHATSAPP_API_TOKEN no está configurado o las plantillas no están definidas.
 *
 * Variables de entorno:
 *   WHATSAPP_TEMPLATE_PROCESSING → plantilla "pedido en preparación" (param: {{1}} shortOrderId)
 *   WHATSAPP_TEMPLATE_SHIPPED    → plantilla "pedido enviado" (params: {{1}} shortOrderId, {{2}} trackingCode)
 */
async function notifyWhatsApp(orderId: string, status: ShippingStatus, trackingCode?: string) {
  const tplProcessing = status === 'processing' ? process.env.WHATSAPP_TEMPLATE_PROCESSING : null;
  const tplShipped    = status === 'shipped'    ? process.env.WHATSAPP_TEMPLATE_SHIPPED    : null;
  if (!tplProcessing && !tplShipped) return;

  try {
    const order = await prisma.order.findUnique({
      where:  { id: orderId },
      select: {
        OrderAddress: { select: { phone: true } },
        shipment:     { select: { trackingCode: true } },
        trackingCode: true,
      },
    });
    const waPhone = toE164Colombia(order?.OrderAddress?.phone ?? '');
    if (!waPhone) return;

    const shortId       = orderId.split('-').at(-1)?.toUpperCase() ?? orderId;
    const effectiveCode = trackingCode || order?.shipment?.trackingCode || order?.trackingCode || '';

    if (tplProcessing) await sendTemplate(waPhone, tplProcessing, [shortId]);
    if (tplShipped)    await sendTemplate(waPhone, tplShipped, [shortId, effectiveCode]);
  } catch (err) {
    logger.error({ orderId, error: String(err) }, 'WhatsApp: error enviando notificación de estado');
  }
}

/** Email "tu pedido va en camino" con link de rastreo por transportadora. */
async function sendShippedEmail(orderId: string, trackingCode?: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user:         { select: { email: true, name: true } },
        OrderAddress: { select: { firstName: true } },
        shipment:     { select: { carrier: true, trackingCode: true } },
      },
    });
    const recipientEmail = order?.user?.email ?? order?.guestEmail;
    const recipientName  = order?.user?.name?.split(' ')[0] ?? order?.OrderAddress?.firstName ?? 'Cliente';
    const carrier        = order?.shipment?.carrier ?? null;
    const effectiveCode  = trackingCode || order?.shipment?.trackingCode || order?.trackingCode || undefined;
    const trackUrl       = carrierTrackingUrl(carrier, effectiveCode);
    if (!recipientEmail) return;

    const html = await render(OrderShippedEmail({
      orderId,
      firstName:    recipientName,
      trackingCode: effectiveCode,
      trackingUrl:  trackUrl ?? undefined,
      carrierName:  carrier && carrier !== 'manual' ? carrierLabel(carrier) : undefined,
    }));
    await resend.emails.send({
      from:    EMAIL_FROM,
      to:      recipientEmail,
      subject: `KYZZ · Tu pedido #${orderId.split('-').at(-1)?.toUpperCase()} está en camino`,
      html,
    });
  } catch (emailErr) {
    logger.error({ orderId, error: String(emailErr) }, 'Error enviando email de envío');
  }
}
