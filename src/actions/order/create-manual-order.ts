'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath, updateTag } from 'next/cache';
import { TAX_RATE, FREE_SHIPPING_THRESHOLD, SHIPPING_COST, COD_RESERVATION_HOURS } from '@/config/constants';
import { reserveStock } from '@/lib/stock-ops';
import { render } from '@react-email/components';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { OrderConfirmationEmail } from '@/emails/OrderConfirmationEmail';
import { logger } from '@/lib/logger';
import type { Address } from '@/interfaces';
import type { SalesChannel, PaymentMethod, Prisma } from '@prisma/client';

interface ManualOrderItem {
  variantId: string;
  quantity:  number;
}

interface ManualOrderInput {
  channel:       SalesChannel;
  paymentMethod: PaymentMethod;
  markPaid:      boolean;       // pago ya recibido (ej. transferencia)
  email?:        string;        // opcional — vincula a usuario existente o queda como invitado
  address:       Address;
  items:         ManualOrderItem[];
}

/**
 * Crea una orden registrada manualmente por el equipo (ventas por WhatsApp /
 * otros canales). Reserva stock igual que el checkout web y deja la venta
 * trazable por canal. Solo admin.
 */
export const createManualOrder = async (input: ManualOrderInput) => {
  const session = await auth();
  if (session?.user?.role !== 'admin') return { ok: false, message: 'No autorizado' };

  const { channel, paymentMethod, markPaid, address, items } = input;
  const email = input.email?.toLowerCase().trim() || undefined;

  if (!items?.length) return { ok: false, message: 'Agrega al menos un producto.' };
  if (items.some((i) => i.quantity < 1)) return { ok: false, message: 'Cantidades inválidas.' };
  if (!address.firstName || !address.address || !address.city || !address.country || !address.phone) {
    return { ok: false, message: 'Completa los datos de entrega (nombre, dirección, ciudad, país, teléfono).' };
  }

  try {
    // Snapshot de variantes (precio, producto, talla, color)
    const variantIds = Array.from(new Set(items.map((i) => i.variantId)));
    const variants = await prisma.productVariant.findMany({
      where:  { id: { in: variantIds } },
      select: {
        id:      true,
        size:    true,
        product: { select: { id: true, price: true, title: true, slug: true } },
        color:   { select: { paletteColor: { select: { name: true } } } },
      },
    });

    const lines = items.map((it) => {
      const v = variants.find((x) => x.id === it.variantId);
      if (!v) throw new Error('Variante no encontrada');
      return {
        variantId: v.id,
        productId: v.product.id,
        slug:      v.product.slug,
        quantity:  it.quantity,
        size:      v.size,
        colorName: v.color?.paletteColor.name ?? null,
        price:     v.product.price,
        title:     v.product.title,
      };
    });

    const subTotal     = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const tax          = lines.reduce((s, l) => s + l.price * l.quantity * (TAX_RATE / (1 + TAX_RATE)), 0);
    const shipping     = subTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total        = subTotal + shipping;
    const itemsInOrder = lines.reduce((c, l) => c + l.quantity, 0);

    // Vincular a usuario existente por email (mejora CRM/LTV); si no, queda como invitado.
    const existingUser = email
      ? await prisma.user.findUnique({ where: { email }, select: { id: true } })
      : null;

    // COD sin pagar → la reserva expira si no se confirma. Si ya está pagado, no expira.
    const reservationExpiresAt = paymentMethod === 'cod' && !markPaid
      ? new Date(Date.now() + COD_RESERVATION_HOURS * 60 * 60 * 1000)
      : null;

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await reserveStock(tx, lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })));

      const order = await tx.order.create({
        data: {
          userId:               existingUser?.id ?? null,
          guestEmail:           existingUser ? null : (email ?? null),
          channel,
          paymentMethod,
          reservationExpiresAt,
          itemsInOrder,
          subTotal,
          tax,
          total,
          shippingCost: shipping,
          ...(markPaid
            ? {
                isPaid:         true,
                paidAt:         new Date(),
                paymentGateway: 'manual' as const,
                codConfirmedAt: paymentMethod === 'cod' ? new Date() : null,
              }
            : {}),
          OrderItem: {
            createMany: {
              data: lines.map((l) => ({
                quantity:  l.quantity,
                size:      l.size,
                productId: l.productId,
                variantId: l.variantId,
                colorName: l.colorName,
                price:     l.price,
              })),
            },
          },
        },
      });

      const { country, ...rest } = address;
      await tx.orderAddress.create({ data: { ...rest, countryId: country, orderId: order.id } });

      return order;
    });

    revalidatePath('/admin/orders');

    // Invalidar cache ISR de la PDP: la reserva redujo el disponible y la web
    // debe dejar de ofrecer esas unidades de inmediato (evita oversell visible).
    for (const slug of new Set(lines.map((l) => l.slug))) {
      updateTag(`product:${slug}`);
    }

    // Email de confirmación al cliente si se proporcionó un email
    if (email && process.env.RESEND_API_KEY) {
      try {
        const html = await render(OrderConfirmationEmail({
          orderId:   created.id,
          firstName: address.firstName,
          items:     lines.map((l) => ({ title: l.title, size: l.size, quantity: l.quantity, price: l.price })),
          subtotal:  subTotal,
          tax,
          total,
          address:   address.address,
          city:      address.city,
        }));
        const isPaidNow = markPaid;
        await resend.emails.send({
          from:    EMAIL_FROM,
          to:      email,
          subject: isPaidNow
            ? `KYZZ · Pedido confirmado #${created.id.split('-').at(-1)?.toUpperCase()}`
            : `KYZZ · Pedido recibido #${created.id.split('-').at(-1)?.toUpperCase()}`,
          html,
        });
      } catch (emailErr) {
        logger.error({ orderId: created.id, error: String(emailErr) }, 'Manual order: error enviando email');
      }
    }

    return { ok: true, orderId: created.id };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Error al crear el pedido' };
  }
};

export interface OrderableVariant {
  id:        string;
  size:      string;
  available: number;
  price:     number;
  colorName: string | null;
  colorHex:  string | null;
}

/** Variantes de un producto con disponibilidad real (stock - reserved). Solo admin. */
export const getOrderableVariants = async (productId: string): Promise<OrderableVariant[]> => {
  const session = await auth();
  if (session?.user?.role !== 'admin') return [];

  const variants = await prisma.productVariant.findMany({
    where:  { productId },
    select: {
      id:       true,
      size:     true,
      stock:    true,
      reserved: true,
      product:  { select: { price: true } },
      color:    { select: { paletteColor: { select: { name: true, hex: true } } } },
    },
    orderBy: [{ colorId: 'asc' }, { size: 'asc' }],
  });

  return variants.map((v) => ({
    id:        v.id,
    size:      v.size,
    available: v.stock - v.reserved,
    price:     v.product.price,
    colorName: v.color?.paletteColor.name ?? null,
    colorHex:  v.color?.paletteColor.hex ?? null,
  }));
};
