'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { paypalCheckPayment } from './paypal-check-payment';

/**
 * Verifica si ya existe un pago de PayPal procesado para esta orden de KYZZ.
 * Útil cuando la captura fue exitosa en PayPal pero falló el update en BD,
 * o cuando PayPal rechaza por DUPLICATE_INVOICE_ID en un reintento.
 */
export const verifyExistingPaypalPayment = async (kyzzOrderId: string) => {
  const session = await auth();

  const order = await prisma.order.findUnique({
    where:  { id: kyzzOrderId },
    select: { userId: true, transactionId: true, isPaid: true },
  });

  if (!order) return { ok: false, message: 'Orden no encontrada' };

  // Órdenes de invitado (userId === null): UUID es la "llave"
  // Órdenes de usuario: debe ser el propietario o admin
  if (order.userId !== null) {
    if (!session?.user?.id) return { ok: false, message: 'No autenticado' };
    if (order.userId !== session.user.id && session.user.role !== 'admin') {
      return { ok: false, message: 'No autorizado' };
    }
  }

  if (order.isPaid)         return { ok: true };
  if (!order.transactionId) return { ok: false, message: 'Sin transacción registrada para esta orden' };

  return paypalCheckPayment(order.transactionId);
};
