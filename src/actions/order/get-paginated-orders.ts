'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// Listas de valores válidos para validar los parámetros de URL antes de pasarlos
// a Prisma — evita que un ?status=hack crashee la página con un enum inválido.
const VALID_SHIPPING_STATUS = ['pending', 'processing', 'shipped', 'delivered', 'returned'] as const;
// 'manual' es un valor especial (no existe en el enum): agrupa whatsapp+instagram+other.
const VALID_CHANNELS        = ['web', 'whatsapp', 'instagram', 'other', 'manual'] as const;

type ValidShippingStatus = typeof VALID_SHIPPING_STATUS[number];
type ValidChannel        = typeof VALID_CHANNELS[number];

interface Options {
  page?:          number;
  take?:          number;
  query?:         string;
  /** Filtrar por estado de envío. 'cancelled' es un valor especial para cancelledAt != null. */
  statusFilter?:  string;
  /** Filtrar por canal de venta (web | whatsapp | instagram | other). */
  channelFilter?: string;
  /** Filtrar por estado de pago: 'paid' | 'unpaid'. */
  paidFilter?:    string;
}

export const getPaginatedOrders = async ({
  page = 1, take = 15, query,
  statusFilter, channelFilter, paidFilter,
}: Options = {}) => {
  const session = await auth();
  if (session?.user.role !== 'admin') {
    return { ok: false, message: 'Debe estar autenticado' };
  }

  // Validar y normalizar parámetros de URL — ignorar valores no reconocidos
  // en lugar de pasarlos a Prisma y provocar un error de enum inválido.
  const isCancelledFilter = statusFilter === 'cancelled';
  const validStatus = VALID_SHIPPING_STATUS.includes(statusFilter as ValidShippingStatus)
    ? (statusFilter as ValidShippingStatus)
    : null;
  const validChannel = VALID_CHANNELS.includes(channelFilter as ValidChannel)
    ? (channelFilter as ValidChannel)
    : null;

  const andClauses: Prisma.OrderWhereInput[] = [];

  if (query?.trim()) {
    andClauses.push({
      OR: [
        { id:           { contains: query, mode: 'insensitive' } },
        { user:         { email: { contains: query, mode: 'insensitive' } } },
        { guestEmail:   { contains: query, mode: 'insensitive' } },
        { OrderAddress: { firstName: { contains: query, mode: 'insensitive' } } },
        { OrderAddress: { lastName:  { contains: query, mode: 'insensitive' } } },
        { OrderAddress: { phone:     { contains: query, mode: 'insensitive' } } },
      ],
    });
  }

  if (isCancelledFilter) {
    // Filtro "Cancelado": muestra solo canceladas, ignorar el filtro de pago
    // (una cancelada puede estar pagada o no — filtrar ambas a la vez da WHERE imposible).
    andClauses.push({ cancelledAt: { not: null } });
  } else {
    if (validStatus) {
      andClauses.push({ cancelledAt: null, shippingStatus: validStatus });
    }
    // Filtro de pago solo aplica a pedidos NO cancelados
    if (paidFilter === 'paid')   andClauses.push({ isPaid: true });
    if (paidFilter === 'unpaid') andClauses.push({ isPaid: false, cancelledAt: null });
  }

  if (validChannel) {
    if (validChannel === 'manual') {
      // "Manual" = cualquier canal que no sea web (WhatsApp + Instagram + Otro)
      andClauses.push({ channel: { in: ['whatsapp', 'instagram', 'other'] } });
    } else {
      andClauses.push({ channel: validChannel });
    }
  }

  const where: Prisma.OrderWhereInput = andClauses.length > 0 ? { AND: andClauses } : {};

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * take,
      take,
      select: {
        id:             true,
        createdAt:      true,
        total:          true,
        subTotal:       true,
        shippingCost:   true,
        couponDiscount: true,
        couponCode:     true,
        isPaid:         true,
        cancelledAt:    true,
        shippingStatus: true,
        paymentMethod:  true,
        channel:        true,
        guestEmail:     true,
        OrderAddress:   { select: { firstName: true, lastName: true } },
        user:           { select: { email: true } },
        _count:         { select: { OrderItem: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    ok:         true,
    orders,
    totalPages: Math.ceil(total / take),
    total,
  };
};
