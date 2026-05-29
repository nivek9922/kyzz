'use server';

import { ShippingStatus } from '@prisma/client';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { applyShippingTransition } from '@/lib/shipping/apply-shipping-status';
import { sendTemplate } from '@/lib/whatsapp-api';
import { toE164Colombia } from '@/lib/phone';

interface UpdateShippingInput {
  orderId:        string;
  shippingStatus: ShippingStatus;
  trackingCode?:  string;
  shippingNotes?: string;
}

/**
 * Cambio manual del estado de envío por el admin. Delega en el núcleo
 * compartido (applyShippingTransition), que también usa el webhook de tracking.
 */
export const updateOrderShipping = async ({
  orderId,
  shippingStatus,
  trackingCode,
  shippingNotes,
}: UpdateShippingInput) => {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado' };

  return applyShippingTransition(orderId, shippingStatus, {
    trackingCode,
    shippingNotes,
    enforcePaymentGate: true, // acción manual del admin: respeta el gate de pago
  });
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

  try {
    const updated = await prisma.order.update({
      where:  { id: orderId },
      data:   { codConfirmedAt: new Date(), reservationExpiresAt: null, shippingStatus: 'processing' },
      select: { OrderAddress: { select: { phone: true } } },
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders');
    revalidatePath(`/orders/${orderId}`);

    // WhatsApp: notificar al cliente que el pedido fue confirmado y está siendo preparado.
    const tpl = process.env.WHATSAPP_TEMPLATE_PROCESSING;
    if (tpl) {
      try {
        const waPhone = toE164Colombia(updated.OrderAddress?.phone ?? '');
        if (waPhone) {
          const shortId = orderId.split('-').at(-1)?.toUpperCase() ?? orderId;
          await sendTemplate(waPhone, tpl, [shortId]);
        }
      } catch { /* no bloquear el flujo */ }
    }

    return { ok: true };
  } catch {
    return { ok: false, message: 'Error al confirmar el pedido' };
  }
};
