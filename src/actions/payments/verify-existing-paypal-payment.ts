'use server';

import prisma from '@/lib/prisma';
import { paypalCheckPayment } from './paypal-check-payment';

/**
 * Verifica si ya existe un pago de PayPal procesado para esta orden de KYZZ.
 * Útil cuando la captura fue exitosa en PayPal pero falló el update en BD,
 * o cuando PayPal rechaza por DUPLICATE_INVOICE_ID en un reintento.
 */
export const verifyExistingPaypalPayment = async (kyzzOrderId: string) => {
  const order = await prisma.order.findUnique({
    where:  { id: kyzzOrderId },
    select: { transactionId: true, isPaid: true },
  });

  if (!order)              return { ok: false, message: 'Orden no encontrada' };
  if (order.isPaid)        return { ok: true };
  if (!order.transactionId) return { ok: false, message: 'Sin transacción registrada para esta orden' };

  console.log('[PayPal][Recovery] Verificando transacción existente:', order.transactionId);
  return paypalCheckPayment(order.transactionId);
};
