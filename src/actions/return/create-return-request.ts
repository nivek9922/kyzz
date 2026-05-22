'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

const schema = z.object({
  orderId: z.string().uuid(),
  reason:  z.string().min(5).max(200),
  details: z.string().max(1000).optional(),
});

export async function createReturnRequest(input: {
  orderId: string;
  reason:  string;
  details?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: 'Debes iniciar sesión.' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Datos inválidos.' };

  const { orderId, reason, details } = parsed.data;

  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { returnRequest: true },
  });

  if (!order) return { ok: false, message: 'Orden no encontrada.' };
  if (order.userId !== session.user.id) return { ok: false, message: 'No autorizado.' };
  if (!order.isPaid) return { ok: false, message: 'Solo puedes solicitar devolución de órdenes pagadas.' };
  if (order.shippingStatus !== 'delivered') return { ok: false, message: 'La orden debe estar entregada para solicitar devolución.' };
  if (order.returnRequest) return { ok: false, message: 'Ya existe una solicitud de devolución para esta orden.' };

  await prisma.returnRequest.create({
    data: { orderId, reason, details: details ?? null },
  });

  return { ok: true };
}
