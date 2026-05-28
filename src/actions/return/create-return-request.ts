'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import type { ReturnType } from '@prisma/client';

const schema = z.object({
  orderId: z.string().uuid(),
  reason:  z.string().min(5).max(200),
  details: z.string().max(1000).optional(),
});

/** Crea una solicitud de devolución desde la página del cliente (requiere sesión). */
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

  if (!order)                                    return { ok: false, message: 'Orden no encontrada.' };
  if (order.userId !== session.user.id)          return { ok: false, message: 'No autorizado.' };
  if (!order.isPaid)                             return { ok: false, message: 'Solo puedes solicitar devolución de órdenes pagadas.' };
  if (order.shippingStatus !== 'delivered')      return { ok: false, message: 'La orden debe estar entregada para solicitar devolución.' };
  if (order.returnRequest)                       return { ok: false, message: 'Ya existe una solicitud de devolución para esta orden.' };

  await prisma.returnRequest.create({
    data: { orderId, reason, details: details ?? null },
  });

  return { ok: true };
}

/**
 * Crea o registra una devolución desde el admin para cualquier orden.
 * Cubre pedidos manuales (WhatsApp/Instagram) y clientes sin cuenta.
 * Solo admin.
 */
export async function createReturnRequestAdmin(input: {
  orderId:     string;
  reason:      string;
  details?:    string;
  returnType?: ReturnType;
}) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado.' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Datos inválidos.' };

  const { orderId, reason, details } = parsed.data;

  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { returnRequest: true },
  });

  if (!order)               return { ok: false, message: 'Orden no encontrada.' };
  if (!order.isPaid)        return { ok: false, message: 'La orden debe estar pagada.' };
  if (order.shippingStatus !== 'delivered') return { ok: false, message: 'La orden debe estar entregada.' };
  if (order.returnRequest)  return { ok: false, message: 'Ya existe una solicitud de devolución para esta orden.' };

  await prisma.returnRequest.create({
    data: {
      orderId,
      reason,
      details:    details              ?? null,
      returnType: input.returnType     ?? null,
    },
  });

  return { ok: true };
}
