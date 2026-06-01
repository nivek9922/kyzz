'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import type { ReturnType, PostSaleType } from '@prisma/client';

const schema = z.object({
  orderId: z.string().uuid(),
  reason:  z.string().min(5).max(200),
  details: z.string().max(1000).optional(),
});

/** Genera un código RMA único para el día: RMA-YYYYMMDD-NNNN */
async function generateRmaCode(): Promise<string> {
  const today   = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const count = await prisma.returnRequest.count({
    where: { createdAt: { gte: startOfDay, lt: endOfDay } },
  });
  return `RMA-${dateStr}-${String(count + 1).padStart(4, '0')}`;
}

/** Calcula la ventana de devolución en días según el tipo de solicitud. */
function getWindowDays(requestType: PostSaleType): number | null {
  switch (requestType) {
    case 'RETURN':           return 7;   // 5 días hábiles ≈ 7 calendario (conservador)
    case 'SIZE_EXCHANGE':
    case 'PRODUCT_EXCHANGE': return 15;
    case 'DEFECTIVE':
    case 'WARRANTY':
    case 'KYZZ_ERROR':       return null; // sin límite
  }
}

/** Crea una solicitud de devolución desde la página del cliente (requiere sesión). */
export async function createReturnRequest(input: {
  orderId:      string;
  reason:       string;
  details?:     string;
  requestType?: PostSaleType;
}) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: 'Debes iniciar sesión.' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Datos inválidos.' };

  const { orderId, reason, details } = parsed.data;
  const requestType = input.requestType ?? 'RETURN';

  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { returnRequest: true },
  });

  if (!order)                                return { ok: false, message: 'Orden no encontrada.' };
  if (order.userId !== session.user.id)      return { ok: false, message: 'No autorizado.' };
  if (!order.isPaid)                         return { ok: false, message: 'Solo puedes solicitar devolución de órdenes pagadas.' };
  if (order.shippingStatus !== 'delivered')  return { ok: false, message: 'La orden debe estar entregada para solicitar devolución.' };
  if (order.returnRequest)                   return { ok: false, message: 'Ya existe una solicitud de devolución para esta orden.' };

  const rmaCode        = await generateRmaCode();
  const windowDays     = getWindowDays(requestType);
  const expiresAt      = windowDays && order.deliveredAt
    ? new Date(order.deliveredAt!.getTime() + windowDays * 24 * 60 * 60 * 1000)
    : null;
  const customerName = session.user.name ?? session.user.email ?? 'Clienta';

  const created = await prisma.returnRequest.create({
    data: {
      orderId,
      reason,
      details:         details     ?? null,
      rmaCode,
      requestType,
      returnWindowDays: windowDays ?? null,
      expiresAt,
    },
  });

  // Evento inicial (audit trail)
  await prisma.returnEvent.create({
    data: {
      returnRequestId: created.id,
      actor:           `customer:${session.user.id}`,
      actorName:       customerName,
      fromStatus:      null,
      toStatus:        'PENDING',
      notes:           reason,
    },
  });

  return { ok: true, rmaCode };
}

/**
 * Crea o registra una devolución desde el admin para cualquier orden.
 * Cubre pedidos manuales (WhatsApp/Instagram) y clientes sin cuenta.
 */
export async function createReturnRequestAdmin(input: {
  orderId:      string;
  reason:       string;
  details?:     string;
  returnType?:  ReturnType;
  requestType?: PostSaleType;
}) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado.' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Datos inválidos.' };

  const { orderId, reason, details } = parsed.data;
  const requestType = input.requestType ?? 'RETURN';

  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { returnRequest: true },
  });

  if (!order)                               return { ok: false, message: 'Orden no encontrada.' };
  if (!order.isPaid)                        return { ok: false, message: 'La orden debe estar pagada.' };
  if (order.shippingStatus !== 'delivered') return { ok: false, message: 'La orden debe estar entregada.' };
  if (order.returnRequest)                  return { ok: false, message: 'Ya existe una solicitud de devolución para esta orden.' };

  const rmaCode    = await generateRmaCode();
  const windowDays = getWindowDays(requestType);
  const expiresAt  = windowDays && order.deliveredAt
    ? new Date(order.deliveredAt.getTime() + windowDays * 24 * 60 * 60 * 1000)
    : null;
  const adminName  = session.user.name ?? session.user.email ?? 'Admin';

  const created = await prisma.returnRequest.create({
    data: {
      orderId,
      reason,
      details:          details           ?? null,
      returnType:       input.returnType  ?? null,
      rmaCode,
      requestType,
      returnWindowDays: windowDays        ?? null,
      expiresAt,
    },
  });

  await prisma.returnEvent.create({
    data: {
      returnRequestId: created.id,
      actor:           `admin:${session.user.id}`,
      actorName:       adminName,
      fromStatus:      null,
      toStatus:        'PENDING',
      notes:           `[Admin] ${reason}`,
    },
  });

  return { ok: true, rmaCode };
}
