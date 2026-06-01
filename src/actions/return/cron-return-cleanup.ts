'use server';

import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

/**
 * Cierra automáticamente las solicitudes APPROVED cuyo plazo de envío venció.
 * Se dispara diariamente para limpiar reservas fantasma y mantener el panel
 * admin sin items zombis.
 *
 * Lógica:
 * - Busca ReturnRequest con status=APPROVED y expiresAt < ahora
 * - Las mueve a CLOSED y registra un ReturnEvent con actor='system'
 * - No toca stock: el producto nunca salió de la bodega del cliente, así que
 *   no hay cuarentena ni reserva de variante que liberar en esta etapa.
 */
export async function runReturnCleanup(): Promise<{
  ok: boolean;
  closedCount?: number;
  message?: string;
}> {
  try {
    const now = new Date();

    const expired = await prisma.returnRequest.findMany({
      where:  { status: 'APPROVED', expiresAt: { lt: now } },
      select: { id: true, rmaCode: true },
    });

    if (expired.length === 0) return { ok: true, closedCount: 0 };

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const ret of expired) {
        const guard = await tx.returnRequest.updateMany({
          where: { id: ret.id, status: 'APPROVED' },
          data:  { status: 'CLOSED' },
        });
        if (guard.count === 0) continue; // ya fue movida por otra transacción

        await tx.returnEvent.create({
          data: {
            returnRequestId: ret.id,
            actor:           'system',
            actorName:       'Sistema KYZZ',
            fromStatus:      'APPROVED',
            toStatus:        'CLOSED',
            notes:           'Plazo de envío vencido — solicitud cerrada automáticamente.',
          },
        });
      }
    });

    console.log(`[Cron] return-cleanup → cerradas: ${expired.length}`);
    return { ok: true, closedCount: expired.length };
  } catch (err) {
    console.error('[runReturnCleanup]', err);
    return { ok: false, message: 'Error en limpieza de devoluciones expiradas' };
  }
}
