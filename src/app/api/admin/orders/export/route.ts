import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/orders/export?period=7d|30d|90d|all
 * Exporta pedidos como CSV para contabilidad / análisis externo.
 * Solo accesible para administradores.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? 'all';
  const DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
  const since = DAYS[period]
    ? new Date(Date.now() - DAYS[period] * 86_400_000)
    : new Date(0);

  const orders = await prisma.order.findMany({
    where:   { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    select: {
      id:            true,
      createdAt:     true,
      paidAt:        true,
      shippedAt:     true,
      deliveredAt:   true,
      cancelledAt:   true,
      isPaid:        true,
      channel:       true,
      paymentMethod: true,
      paymentGateway:true,
      shippingStatus:true,
      subTotal:      true,
      shippingCost:  true,
      couponDiscount:true,
      tax:           true,
      total:         true,
      couponCode:    true,
      trackingCode:  true,
      guestEmail:    true,
      user:         { select: { name: true, email: true } },
      OrderAddress: {
        select: {
          firstName: true, lastName: true,
          address: true, city: true, phone: true,
        },
      },
      OrderItem: {
        select: {
          quantity: true, price: true, size: true,
          product: { select: { title: true } },
        },
      },
    },
  });

  const esc = (v: string | number | boolean | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('\n') || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const fmt = (n: number | null | undefined) => (n != null ? n.toFixed(0) : '');

  const fmtDate = (d: Date | null | undefined) =>
    d ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(d) : '';

  const CHANNEL_LABEL: Record<string, string> = {
    web: 'Web', whatsapp: 'WhatsApp', instagram: 'Instagram', other: 'Otro',
  };
  const STATUS_LABEL: Record<string, string> = {
    pending: 'Pendiente', processing: 'Preparando',
    shipped: 'Enviado', delivered: 'Entregado', returned: 'Devuelto',
  };

  const headers = [
    'ID Pedido', 'Fecha creación', 'Fecha pago', 'Fecha envío', 'Fecha entrega', 'Cancelado',
    'Pagado', 'Canal', 'Método pago', 'Pasarela', 'Estado envío',
    'Cliente', 'Email', 'Teléfono', 'Dirección', 'Ciudad',
    'Subtotal (COP)', 'Envío (COP)', 'Descuento cupón (COP)', 'Impuesto (COP)', 'Total (COP)',
    'Cupón', 'Guía de envío',
    'Productos',
  ];

  const rows = orders.map((o) => {
    const name = o.OrderAddress
      ? `${o.OrderAddress.firstName} ${o.OrderAddress.lastName}`
      : (o.user?.name ?? o.guestEmail ?? '—');
    const email   = o.user?.email ?? o.guestEmail ?? '';
    const phone   = o.OrderAddress?.phone ?? '';
    const address = o.OrderAddress?.address ?? '';
    const city    = o.OrderAddress?.city ?? '';

    const products = o.OrderItem
      .map((item) => `${item.quantity}x ${item.product.title} T${item.size}`)
      .join(' | ');

    return [
      esc(`#${o.id.split('-').at(-1)?.toUpperCase()}`),
      esc(fmtDate(o.createdAt)),
      esc(fmtDate(o.paidAt)),
      esc(fmtDate(o.shippedAt)),
      esc(fmtDate(o.deliveredAt)),
      esc(o.cancelledAt ? 'Sí' : 'No'),
      esc(o.isPaid ? 'Sí' : 'No'),
      esc(CHANNEL_LABEL[o.channel] ?? o.channel),
      esc(o.paymentMethod === 'cod' ? 'Contraentrega' : 'Pago online'),
      esc(o.paymentGateway ?? ''),
      esc(STATUS_LABEL[o.shippingStatus] ?? o.shippingStatus),
      esc(name),
      esc(email),
      esc(phone),
      esc(address),
      esc(city),
      esc(fmt(o.subTotal)),
      esc(fmt(o.shippingCost)),
      esc(fmt(o.couponDiscount)),
      esc(fmt(o.tax)),
      esc(fmt(o.total)),
      esc(o.couponCode ?? ''),
      esc(o.trackingCode ?? ''),
      esc(products),
    ].join(',');
  });

  const csv   = [headers.join(','), ...rows].join('\r\n');
  const today = new Date().toISOString().slice(0, 10);
  const suffix = period === 'all' ? 'completo' : period;

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pedidos-kyzz-${suffix}-${today}.csv"`,
    },
  });
}
