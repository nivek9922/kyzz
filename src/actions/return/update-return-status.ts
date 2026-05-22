'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { render } from '@react-email/components';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { ReturnStatusEmail, type ReturnEmailStatus } from '@/emails/ReturnStatusEmail';
import type { ReturnStatus } from '@prisma/client';

const NOTIFY_STATUSES: ReturnStatus[] = ['APPROVED', 'REJECTED', 'COMPLETED'];

const schema = z.object({
  returnId:        z.string().uuid(),
  status:          z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']),
  adminNotes:      z.string().max(500).optional(),
  customerMessage: z.string().max(800).optional(),
});

export async function updateReturnStatus(input: {
  returnId:        string;
  status:          ReturnStatus;
  adminNotes?:     string;
  customerMessage?: string;
}) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado.' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Datos inválidos.' };

  const { returnId, status, adminNotes, customerMessage } = parsed.data;

  const updated = await prisma.returnRequest.update({
    where: { id: returnId },
    data:  {
      status:          status as ReturnStatus,
      adminNotes:      adminNotes      ?? null,
      customerMessage: customerMessage ?? null,
    },
    include: {
      order: {
        select: {
          id:         true,
          guestEmail: true,
          user:       { select: { name: true, email: true } },
        },
      },
    },
  });

  // Enviar email de notificación al cliente (solo para estados relevantes)
  if (NOTIFY_STATUSES.includes(status as ReturnStatus) && process.env.RESEND_API_KEY) {
    try {
      const order        = updated.order;
      const customerEmail = order.user?.email ?? order.guestEmail;
      const customerName  = order.user?.name  ?? 'Clienta';
      const shortOrderId  = order.id.split('-').at(-1)?.toUpperCase() ?? order.id;
      const appUrl        = process.env.NEXT_PUBLIC_APP_URL ?? '';
      const orderUrl      = `${appUrl}/orders/${order.id}`;

      if (customerEmail) {
        const html = await render(
          ReturnStatusEmail({
            customerName,
            shortOrderId,
            status:          status as ReturnEmailStatus,
            customerMessage: customerMessage || undefined,
            orderUrl,
          }),
        );

        const STATUS_SUBJECT: Record<ReturnEmailStatus, string> = {
          APPROVED:  'Tu solicitud de devolución fue aprobada · KYZZ',
          REJECTED:  'Actualización sobre tu solicitud de devolución · KYZZ',
          COMPLETED: 'Tu devolución ha sido completada · KYZZ',
        };

        await resend.emails.send({
          from:    EMAIL_FROM,
          to:      customerEmail,
          subject: STATUS_SUBJECT[status as ReturnEmailStatus],
          html,
        });
      }
    } catch (err) {
      console.error('[updateReturnStatus] Error enviando email:', err);
      // No falla la operación si el email falla
    }
  }

  revalidatePath('/admin/devoluciones');
  return { ok: true };
}

export async function getReturnRequests() {
  const session = await auth();
  if (session?.user.role !== 'admin') return [];

  return prisma.returnRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      order: {
        select: {
          id:    true,
          total: true,
          user:  { select: { name: true, email: true } },
          guestEmail: true,
        },
      },
    },
  });
}
