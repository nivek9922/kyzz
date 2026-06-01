'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

/** Lista todas las devoluciones del cliente autenticado. */
export async function getMyReturns() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.returnRequest.findMany({
    where:   { order: { userId: session.user.id } },
    orderBy: { createdAt: 'desc' },
    select: {
      id:          true,
      rmaCode:     true,
      status:      true,
      requestType: true,
      reason:      true,
      createdAt:   true,
      order: { select: { id: true, total: true, channel: true } },
    },
  });
}

/**
 * Detalle de una devolución para el cliente.
 * Usa `select` explícito: solo salen al navegador los campos que el cliente
 * debe ver. Los campos internos (adminNotes, conditionNotes, rejectionReason,
 * inspectedBy, refundTransactionId, etc.) nunca abandonan el servidor.
 */
export async function getMyReturnById(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const ret = await prisma.returnRequest.findUnique({
    where: { id },
    select: {
      id:                 true,
      rmaCode:            true,
      status:             true,
      requestType:        true,
      reason:             true,
      details:            true,
      customerMessage:    true,
      expiresAt:          true,
      returnTrackingCode: true,
      returnCarrier:      true,
      proofImageUrl:      true,
      whoPayShipping:     true,
      refundAmount:       true,
      refundMethod:       true,
      refundStatus:       true,
      createdAt:          true,
      order: {
        select: {
          id:     true,
          userId: true, // solo para verificar pertenencia
          OrderItem: {
            select: {
              id:       true,
              size:     true,
              quantity: true,
              variant: {
                select: {
                  color: {
                    select: {
                      images: { select: { url: true }, take: 1, orderBy: { sortOrder: 'asc' } },
                    },
                  },
                },
              },
              product: {
                select: {
                  title:        true,
                  ProductImage: { select: { url: true }, take: 1 },
                  ProductColors: {
                    select: { images: { select: { url: true }, take: 1, orderBy: { sortOrder: 'asc' } } },
                    take:    1,
                  },
                },
              },
            },
          },
        },
      },
      events: {
        orderBy: { createdAt: 'asc' },
        // `notes` se omite a propósito: puede contener lenguaje interno del admin
        select: { id: true, actor: true, actorName: true, fromStatus: true, toStatus: true, createdAt: true },
      },
    },
  });

  if (!ret) return null;
  if (ret.order.userId !== session.user.id) return null; // no pertenece al usuario

  return ret;
}
