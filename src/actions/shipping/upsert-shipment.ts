'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const schema = z.object({
  orderId:      z.string().uuid(),
  carrier:      z.enum([
    'heka', 'mipaquete', 'interrapidisimo', 'servientrega',
    'coordinadora', 'tcc', 'mensajeros_urbanos', 'noventa_y_nueve', 'manual',
  ]),
  trackingCode: z.string().trim().max(120).optional(),
  cost:         z.coerce.number().nonnegative().optional(),
});

/**
 * Crea o actualiza el Shipment de una orden (Fase 1: manual).
 * El admin elige transportadora + pega la guía + costo opcional.
 * Denormaliza `trackingCode` en Order para mantener compatibilidad con la UI/emails actuales.
 * Solo admin.
 */
export async function upsertShipment(input: {
  orderId:      string;
  carrier:      string;
  trackingCode?: string;
  cost?:        number;
}) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado.' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Datos inválidos.' };

  const { orderId, carrier, trackingCode, cost } = parsed.data;
  const code = trackingCode || null;

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!order) return { ok: false, message: 'Orden no encontrada.' };

    await prisma.$transaction([
      prisma.shipment.upsert({
        where:  { orderId },
        update: { carrier, trackingCode: code, ...(cost !== undefined ? { cost } : {}) },
        create: { orderId, carrier, trackingCode: code, ...(cost !== undefined ? { cost } : {}) },
      }),
      // Denormalizar en la orden para que la UI/email actuales sigan funcionando
      prisma.order.update({
        where: { id: orderId },
        data:  { trackingCode: code, ...(cost !== undefined ? { shippingCost: cost } : {}) },
      }),
    ]);

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    console.error('[upsertShipment]', err);
    return { ok: false, message: 'No se pudo guardar el envío.' };
  }
}
