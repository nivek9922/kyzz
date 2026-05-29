'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { sendTemplate } from '@/lib/whatsapp-api';
import { toE164Colombia } from '@/lib/phone';

export const markOrderAsPaid = async (
  orderId:   string,
  reference?: string,
  proofUrl?:  string,
) => {
  const session = await auth();
  if (session?.user.role !== 'admin') {
    return { ok: false, message: 'No autorizado' };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Guarda de idempotencia: solo actualiza si la orden está sin pagar.
      const updated = await tx.order.updateMany({
        where: { id: orderId, isPaid: false },
        data: {
          isPaid:          true,
          paidAt:          new Date(),
          transactionId:   reference?.trim() || `MANUAL-${Date.now()}`,
          paymentGateway:  'manual',
          ...(proofUrl ? { paymentProofUrl: proofUrl } : {}),
        },
      });
      if (updated.count === 0) {
        throw new Error('Este pedido ya fue pagado por otro medio.');
      }

      // Al confirmar el pago, avanzar automáticamente a "procesando" si aún está pendiente.
      // El equipo ya puede alistar el pedido sin tener que cambiar el estado a mano.
      await tx.order.updateMany({
        where: { id: orderId, shippingStatus: 'pending' },
        data:  { shippingStatus: 'processing' },
      });

      return { ok: true as const };
    });

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/orders/${orderId}`);

    // WhatsApp: notificar al cliente que el pago fue recibido y el pedido se está preparando.
    const tplProcessing = process.env.WHATSAPP_TEMPLATE_PROCESSING;
    if (tplProcessing) {
      try {
        const order = await prisma.order.findUnique({
          where:  { id: orderId },
          select: { OrderAddress: { select: { phone: true } } },
        });
        const waPhone = toE164Colombia(order?.OrderAddress?.phone ?? '');
        if (waPhone) {
          const shortId = orderId.split('-').at(-1)?.toUpperCase() ?? orderId;
          await sendTemplate(waPhone, tplProcessing, [shortId]);
        }
      } catch { /* WhatsApp no bloquea el flujo */ }
    }

    return { ok: result.ok, message: undefined };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'No se pudo registrar el pago' };
  }
};
