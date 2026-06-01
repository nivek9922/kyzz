'use server';

import { z } from 'zod';
import { revalidatePath, revalidateTag } from 'next/cache';
import { render } from '@react-email/components';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { ReturnStatusEmail, type ReturnEmailStatus } from '@/emails/ReturnStatusEmail';
import { restoreStock, quarantineStock, releaseFromQuarantine } from '@/lib/stock-ops';
import { sendTemplate } from '@/lib/whatsapp-api';
import { toE164Colombia } from '@/lib/phone';
import type { ReturnStatus, ReturnType, PostSaleType, ShippingResponsibility, InventoryAction, ItemCondition, Prisma } from '@prisma/client';

const NOTIFY_STATUSES: ReturnStatus[] = ['APPROVED', 'REJECTED', 'COMPLETED'];

const ALL_STATUSES = [
  'PENDING', 'EVIDENCE_REQUIRED', 'APPROVED', 'GUIDE_SENT',
  'IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'ACCEPTED',
  'PROCESSING', 'COMPLETED', 'REJECTED', 'REJECTED_AFTER_INSPECT', 'CLOSED',
] as const;

const schema = z.object({
  returnId:            z.string().uuid(),
  status:              z.enum(ALL_STATUSES),
  adminNotes:          z.string().max(500).optional(),
  customerMessage:     z.string().max(800).optional(),
  returnType:          z.enum(['EXCHANGE', 'REFUND']).optional(),
  refundAmount:        z.coerce.number().positive().optional(),
  refundMethod:        z.string().max(200).optional(),
  proofImageUrl:       z.string().url().optional(),
  returnTrackingCode:  z.string().max(100).optional(),
  returnCarrier:       z.string().max(80).optional(),
  itemCondition:       z.enum(['PERFECT','ACCEPTABLE','USED','DAMAGED','DEFECTIVE_CONF','INCOMPLETE']).optional(),
  conditionNotes:      z.string().max(500).optional(),
  rejectionReason:     z.string().max(300).optional(),
});

/** Quién paga el envío de regreso según el tipo de solicitud (Regla 7.2 del doc). */
function resolveShippingResponsibility(requestType: PostSaleType | null): ShippingResponsibility {
  if (!requestType) return 'CUSTOMER';
  switch (requestType) {
    case 'DEFECTIVE':
    case 'WARRANTY':
    case 'KYZZ_ERROR':    return 'KYZZ';
    case 'RETURN':
    case 'SIZE_EXCHANGE':
    case 'PRODUCT_EXCHANGE': return 'CUSTOMER';
  }
}

export async function updateReturnStatus(input: {
  returnId:           string;
  status:             ReturnStatus;
  adminNotes?:        string;
  customerMessage?:   string;
  returnType?:        ReturnType;
  refundAmount?:      number;
  refundMethod?:      string;
  proofImageUrl?:     string;
  returnTrackingCode?: string;
  returnCarrier?:     string;
  itemCondition?:     ItemCondition;
  conditionNotes?:    string;
  rejectionReason?:   string;
}) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado.' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Datos inválidos.' };

  const {
    returnId, status, adminNotes, customerMessage, returnType, refundAmount,
    refundMethod, proofImageUrl, returnTrackingCode, returnCarrier,
    itemCondition, conditionNotes, rejectionReason,
  } = parsed.data;

  try {
    const ret = await prisma.returnRequest.findUnique({
      where:   { id: returnId },
      include: {
        order: {
          select: {
            id:           true,
            guestEmail:   true,
            user:         { select: { name: true, email: true } },
            OrderAddress: { select: { phone: true } },
            OrderItem:    {
              select: {
                productId: true,
                quantity:  true,
                variantId: true,
                product:   { select: { slug: true } },
              },
            },
          },
        },
      },
    });
    if (!ret) return { ok: false, message: 'Solicitud no encontrada.' };

    const prevStatus = ret.status;
    const now        = new Date();
    const adminId    = session.user.id;
    const adminName  = session.user.name ?? session.user.email ?? 'Admin';

    // ── Movimientos de inventario según transición ────────────────────────────
    const orderItems = ret.order.OrderItem
      .filter((i): i is typeof i & { variantId: string } => i.variantId !== null)
      .map((i) => ({ variantId: i.variantId, quantity: i.quantity }));

    const enteringReceived        = status === 'RECEIVED'               && prevStatus !== 'RECEIVED';
    const enteringAccepted        = status === 'ACCEPTED'               && prevStatus !== 'ACCEPTED';
    const enteringRejectedInspect = status === 'REJECTED_AFTER_INSPECT' && prevStatus !== 'REJECTED_AFTER_INSPECT';
    // Lógica legada: COMPLETED → restoreStock (compatibilidad con fase 0)
    const legacyRestock           = status === 'COMPLETED'             && prevStatus !== 'COMPLETED'
                                    && !['ACCEPTED','PROCESSING'].includes(prevStatus);

    // ── Asignar automáticamente quién paga el envío al aprobar ────────────────
    const whoPayShipping: ShippingResponsibility | undefined =
      (status === 'APPROVED' && prevStatus !== 'APPROVED')
        ? resolveShippingResponsibility(ret.requestType)
        : undefined;

    // Campos a persistir (todos los condicionales en un solo objeto)
    const updateData: Prisma.ReturnRequestUpdateManyMutationInput = {
      status,
      adminNotes:      adminNotes      ?? null,
      customerMessage: customerMessage ?? null,
      ...(returnType         ? { returnType }         : {}),
      ...(refundAmount       ? { refundAmount }       : {}),
      ...(refundMethod       ? { refundMethod }       : {}),
      ...(proofImageUrl      ? { proofImageUrl }      : {}),
      ...(returnTrackingCode ? { returnTrackingCode } : {}),
      ...(returnCarrier      ? { returnCarrier }      : {}),
      ...(itemCondition      ? { itemCondition }      : {}),
      ...(conditionNotes     ? { conditionNotes }     : {}),
      ...(rejectionReason    ? { rejectionReason }    : {}),
      ...(whoPayShipping     ? { whoPayShipping }     : {}),
      ...(status === 'APPROVED' && prevStatus !== 'APPROVED' ? { approvedBy: adminId, approvedAt: now } : {}),
      ...(status === 'REJECTED' && prevStatus !== 'REJECTED' ? { rejectedBy: adminId, rejectedAt: now } : {}),
      ...(enteringRejectedInspect ? { rejectedBy: adminId, rejectedAt: now } : {}),
      ...(enteringReceived ? { receivedAt: now } : {}),
      ...(status === 'INSPECTING' && prevStatus !== 'INSPECTING' ? { inspectedAt: now, inspectedBy: adminId } : {}),
    };

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Guard atómico contra concurrencia: cambia el estado SOLO si sigue en
      // prevStatus. El UPDATE adquiere el row-lock; si otra transacción ya lo
      // movió, count===0 → abortamos antes de tocar el stock (evita doble
      // cuarentena/restock). Mismo patrón que apply-shipping-status.
      const guard = await tx.returnRequest.updateMany({
        where: { id: returnId, status: prevStatus },
        data:  updateData,
      });
      if (guard.count === 0) throw new Error('CONCURRENT_MODIFICATION');

      // Side-effects de stock — seguros porque ganamos el lock de la fila
      if (enteringReceived        && orderItems.length > 0) await quarantineStock(tx, orderItems);
      if (enteringAccepted        && orderItems.length > 0)
        await releaseFromQuarantine(tx, orderItems.map((i) => ({ ...i, action: 'RESTOCK' as InventoryAction })));
      if (enteringRejectedInspect && orderItems.length > 0)
        await releaseFromQuarantine(tx, orderItems.map((i) => ({ ...i, action: 'DESTROY' as InventoryAction })));
      if (legacyRestock           && orderItems.length > 0) await restoreStock(tx, orderItems);

      await tx.returnEvent.create({
        data: {
          returnRequestId: returnId,
          actor:           `admin:${adminId}`,
          actorName:       adminName,
          fromStatus:      prevStatus,
          toStatus:        status,
          notes:           adminNotes ?? rejectionReason ?? conditionNotes ?? null,
        },
      });
    });

    // Email al cliente (fuera de tx)
    if (NOTIFY_STATUSES.includes(status) && process.env.RESEND_API_KEY) {
      try {
        const order         = ret.order;
        const customerEmail = order.user?.email ?? order.guestEmail;
        const customerName  = order.user?.name  ?? 'Clienta';
        const shortOrderId  = order.id.split('-').at(-1)?.toUpperCase() ?? order.id;
        const orderUrl      = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/orders/${order.id}`;

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

    // WhatsApp al cliente para APPROVED y COMPLETED
    const WA_STATUSES: ReturnStatus[] = ['APPROVED', 'COMPLETED'];
    if (WA_STATUSES.includes(status)) {
      try {
        const rawPhone  = ret.order.OrderAddress?.phone ?? '';
        const waPhone   = toE164Colombia(rawPhone);
        const rmaLabel  = ret.rmaCode ?? returnId.slice(-8).toUpperCase();

        if (waPhone) {
          if (status === 'APPROVED') {
            const templateName = process.env.WHATSAPP_TEMPLATE_RETURN_APPROVED ?? 'return_approved';
            // {{1}} = RMA, {{2}} = instrucciones breves
            await sendTemplate(waPhone, templateName, [
              rmaLabel,
              'Empaca el producto con sus etiquetas y envíalo a nuestra bodega. Recibirás las instrucciones por email.',
            ]);
          } else if (status === 'COMPLETED') {
            const templateName = process.env.WHATSAPP_TEMPLATE_RETURN_COMPLETED ?? 'return_completed';
            // {{1}} = RMA, {{2}} = mensaje de cierre
            await sendTemplate(waPhone, templateName, [
              rmaLabel,
              customerMessage || 'Tu solicitud fue resuelta exitosamente. ¡Gracias por confiar en KYZZ!',
            ]);
          }
        }
      } catch (err) {
        console.error('[updateReturnStatus] WhatsApp error:', err);
      }
    }

    revalidatePath('/admin/devoluciones');
    revalidatePath(`/admin/devoluciones/${returnId}`);
    revalidatePath(`/admin/orders/${ret.order.id}`);

    if (legacyRestock || enteringAccepted) {
      for (const slug of new Set(ret.order.OrderItem.map((i) => i.product?.slug).filter(Boolean) as string[])) {
        revalidateTag(`product:${slug}`);
      }
    }

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'CONCURRENT_MODIFICATION') {
      return { ok: false, message: 'El estado cambió mientras editabas. Recarga la página e intenta de nuevo.' };
    }
    console.error('[updateReturnStatus]', err);
    return { ok: false, message: 'Error al actualizar la devolución.' };
  }
}

/** Sigue disponible para compatibilidad con código anterior */
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
