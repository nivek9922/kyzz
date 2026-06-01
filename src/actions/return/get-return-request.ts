'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import type { Prisma, ReturnStatus, PostSaleType, SalesChannel } from '@prisma/client';

// Valores válidos para validar parámetros de URL antes de pasarlos a Prisma
// (un enum inválido en el where lanza error y rompe la página).
const VALID_STATUS: ReturnStatus[] = [
  'PENDING', 'EVIDENCE_REQUIRED', 'APPROVED', 'GUIDE_SENT', 'IN_TRANSIT',
  'RECEIVED', 'INSPECTING', 'ACCEPTED', 'PROCESSING', 'COMPLETED',
  'REJECTED', 'REJECTED_AFTER_INSPECT', 'CLOSED',
];
const VALID_TYPE: PostSaleType[]   = ['RETURN', 'SIZE_EXCHANGE', 'PRODUCT_EXCHANGE', 'DEFECTIVE', 'WARRANTY', 'KYZZ_ERROR'];
const VALID_CHANNEL: SalesChannel[] = ['web', 'whatsapp', 'instagram', 'other'];

/** Detalle completo de una solicitud para la página /admin/devoluciones/[id] */
export async function getReturnRequestById(id: string) {
  const session = await auth();
  if (session?.user.role !== 'admin') return null;

  return prisma.returnRequest.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          OrderAddress: true,
          user:         { select: { id: true, name: true, email: true } },
          OrderItem: {
            include: {
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
                  id:           true,
                  title:        true,
                  slug:         true,
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
      events: { orderBy: { createdAt: 'asc' } },
      items:  true,
    },
  });
}

/** Lista para /admin/devoluciones con campos extendidos de Fase 2 */
export async function getReturnRequestsList(filters?: {
  status?:  string;
  type?:    string;
  channel?: string;
  urgency?: string; // 'urgent' (>48h pending) | 'expiring' (expiresAt < 3 días)
}) {
  const session = await auth();
  if (session?.user.role !== 'admin') return [];

  const where: Prisma.ReturnRequestWhereInput = {};

  // Validar cada parámetro contra su whitelist — ignorar valores no reconocidos
  // en vez de pasarlos a Prisma (un enum inválido lanzaría error y rompe la página).
  const status  = VALID_STATUS.includes(filters?.status as ReturnStatus)   ? (filters!.status as ReturnStatus)  : null;
  const type    = VALID_TYPE.includes(filters?.type as PostSaleType)       ? (filters!.type as PostSaleType)    : null;
  const channel = VALID_CHANNEL.includes(filters?.channel as SalesChannel) ? (filters!.channel as SalesChannel) : null;

  if (type)    where.requestType = type;
  if (channel) where.order       = { channel };

  if (filters?.urgency === 'urgent') {
    // "Sin atender": PENDING con más de 48h — tiene prioridad sobre el filtro de estado
    where.status    = 'PENDING';
    where.createdAt = { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) };
  } else {
    if (status) where.status = status;
    if (filters?.urgency === 'expiring') {
      where.expiresAt = { lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), gte: new Date() };
    }
  }

  return prisma.returnRequest.findMany({
    where,
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
      _count: { select: { events: true } },
    },
  });
}
