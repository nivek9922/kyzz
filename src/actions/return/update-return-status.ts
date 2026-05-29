'use server';

import { z } from 'zod';
import { revalidatePath, revalidateTag } from 'next/cache';
import { render } from '@react-email/components';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { ReturnStatusEmail, type ReturnEmailStatus } from '@/emails/ReturnStatusEmail';
import { restoreStock } from '@/lib/stock-ops';
import type { ReturnStatus, ReturnType, Prisma } from '@prisma/client';

const NOTIFY_STATUSES: ReturnStatus[] = ['APPROVED', 'REJECTED', 'COMPLETED'];

const schema = z.object({
  returnId:        z.string().uuid(),
  status:          z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']),
  adminNotes:      z.string().max(500).optional(),
  customerMessage: z.string().max(800).optional(),
  returnType:      z.enum(['EXCHANGE', 'REFUND']).optional(),
  refundAmount:    z.coerce.number().positive().optional(),
  refundMethod:    z.string().max(200).optional(),
  proofImageUrl:   z.string().url().optional(),
});

export async function updateReturnStatus(input: {
  returnId:        string;
  status:          ReturnStatus;
  adminNotes?:     string;
  customerMessage?: string;
  returnType?:     ReturnType;
  refundAmount?:   number;
  refundMethod?:   string;
  proofImageUrl?:  string;
}) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado.' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Datos inválidos.' };

  const { returnId, status, adminNotes, customerMessage, returnType, refundAmount, refundMethod, proofImageUrl } = parsed.data;

  try {
    // Obtener la devolución actual con los items de la orden
    const ret = await prisma.returnRequest.findUnique({
      where:   { id: returnId },
      include: {
        order: {
          select: {
            id:            true,
            guestEmail:    true,
            shippingStatus: true,
            user:           { select: { name: true, email: true } },
            OrderItem:      { select: { productId: true, quantity: true, variantId: true, product: { select: { slug: true } } } },
          },
        },
      },
    });
    if (!ret) return { ok: false, message: 'Solicitud no encontrada.' };

    // ¿Esta transición restaura stock físico? (devolución completada por primera vez)
    const didRestock = status === 'COMPLETED' && ret.status !== 'COMPLETED';

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Al completar: el producto volvió físicamente → restaurar stock
      if (didRestock) {
        const items = ret.order.OrderItem
          .filter((i): i is typeof i & { variantId: string } => i.variantId !== null)
          .map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
        if (items.length > 0) await restoreStock(tx, items);
      }

      await tx.returnRequest.update({
        where: { id: returnId },
        data:  {
          status,
          adminNotes:      adminNotes      ?? null,
          customerMessage: customerMessage ?? null,
          ...(returnType    ? { returnType }    : {}),
          ...(refundAmount  ? { refundAmount }  : {}),
          ...(refundMethod  ? { refundMethod }  : {}),
          ...(proofImageUrl ? { proofImageUrl } : {}),
        },
      });
    });

    // Email al cliente (fuera de la tx — no revierte la operación si falla)
    if (NOTIFY_STATUSES.includes(status) && process.env.RESEND_API_KEY) {
      try {
        const order         = ret.order;
        const customerEmail = order.user?.email ?? order.guestEmail;
        const customerName  = order.user?.name  ?? 'Clienta';
        const shortOrderId  = order.id.split('-').at(-1)?.toUpperCase() ?? order.id;
        const appUrl        = process.env.NEXT_PUBLIC_APP_URL ?? '';
        const orderUrl      = `${appUrl}/orders/${order.id}`;

        if (customerEmail) {
          const html = await render(
            ReturnStatusEmail({ customerName, shortOrderId, status: status as ReturnEmailStatus, customerMessage: customerMessage || undefined, orderUrl }),
          );
          const STATUS_SUBJECT: Record<ReturnEmailStatus, string> = {
            APPROVED:  'Tu solicitud de devolución fue aprobada · KYZZ',
            REJECTED:  'Actualización sobre tu solicitud de devolución · KYZZ',
            COMPLETED: 'Tu devolución ha sido completada · KYZZ',
          };
          await resend.emails.send({ from: EMAIL_FROM, to: customerEmail, subject: STATUS_SUBJECT[status as ReturnEmailStatus], html });
        }
      } catch (err) {
        console.error('[updateReturnStatus] Email error:', err);
      }
    }

    revalidatePath('/admin/devoluciones');
    revalidatePath(`/admin/orders/${ret.order.id}`);

    // Si se restauró stock, refrescar la PDP para que el disponible suba al instante.
    if (didRestock) {
      for (const slug of new Set(ret.order.OrderItem.map((i) => i.product?.slug).filter(Boolean) as string[])) {
        revalidateTag(`product:${slug}`);
      }
    }

    return { ok: true };
  } catch (err) {
    console.error('[updateReturnStatus]', err);
    return { ok: false, message: 'Error al actualizar la devolución.' };
  }
}

export async function getReturnRequests() {
  const session = await auth();
  if (session?.user.role !== 'admin') return [];

  return prisma.returnRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      order: {
        select: {
          id:            true,
          total:         true,
          channel:       true,
          paymentMethod: true,
          user:          { select: { name: true, email: true } },
          guestEmail:    true,
        },
      },
    },
  });
}
