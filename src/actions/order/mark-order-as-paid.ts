'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

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
    // Guarda de idempotencia: solo actualiza si la orden está sin pagar.
    // Impide sobreescribir un pago legítimo de Wompi o cualquier otro gateway.
    const updated = await prisma.order.updateMany({
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
      return { ok: false, message: 'Este pedido ya fue pagado por otro medio.' };
    }

    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/orders/${orderId}`);

    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, message: 'No se pudo registrar el pago' };
  }
};
