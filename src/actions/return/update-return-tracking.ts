'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

const schema = z.object({
  returnId:     z.string().uuid(),
  trackingCode: z.string().min(4).max(100),
  carrier:      z.string().max(80).optional(),
});

/**
 * El cliente proporciona el código de guía cuando ya envió el producto de regreso.
 * Auto-avanza el estado a IN_TRANSIT y registra un ReturnEvent como actor 'customer'.
 */
export async function updateReturnTracking(input: {
  returnId:     string;
  trackingCode: string;
  carrier?:     string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: 'Debes iniciar sesión.' };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Datos inválidos.' };

  const { returnId, trackingCode, carrier } = parsed.data;

  try {
    // Verificar que la devolución pertenece al usuario y está en un estado válido
    const ret = await prisma.returnRequest.findUnique({
      where:   { id: returnId },
      include: { order: { select: { userId: true } } },
    });

    if (!ret)                              return { ok: false, message: 'Solicitud no encontrada.' };
    if (ret.order.userId !== session.user.id) return { ok: false, message: 'No autorizado.' };
    if (!['APPROVED', 'GUIDE_SENT'].includes(ret.status)) {
      return { ok: false, message: 'No puedes agregar un código de guía en este momento.' };
    }

    const customerName = session.user.name ?? session.user.email ?? 'Clienta';

    await prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({
        where: { id: returnId },
        data:  {
          returnTrackingCode: trackingCode,
          returnCarrier:      carrier ?? null,
          status:             'IN_TRANSIT',
        },
      });

      await tx.returnEvent.create({
        data: {
          returnRequestId: returnId,
          actor:           `customer:${session.user.id}`,
          actorName:       customerName,
          fromStatus:      ret.status,
          toStatus:        'IN_TRANSIT',
          notes:           `Guía de envío: ${trackingCode}${carrier ? ` · ${carrier}` : ''}`,
        },
      });
    });

    revalidatePath(`/devoluciones/${returnId}`);
    revalidatePath(`/admin/devoluciones/${returnId}`);
    return { ok: true };
  } catch {
    return { ok: false, message: 'Error al guardar el código de envío.' };
  }
}
