import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/returns/export
 * Exporta todas las solicitudes de devolución como CSV para contabilidad.
 * Solo accesible para administradores.
 */
export async function GET() {
  const session = await auth();
  if (session?.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const returns = await prisma.returnRequest.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      rmaCode:            true,
      status:             true,
      requestType:        true,
      reasonCategory:     true,
      reason:             true,
      createdAt:          true,
      updatedAt:          true,
      whoPayShipping:     true,
      returnShippingCost: true,
      refundAmount:       true,
      refundMethod:       true,
      refundStatus:       true,
      returnTrackingCode: true,
      returnCarrier:      true,
      itemCondition:      true,
      order: {
        select: {
          id:            true,
          total:         true,
          channel:       true,
          paymentMethod: true,
          guestEmail:    true,
          user:          { select: { name: true, email: true } },
          OrderAddress:  { select: { city: true, address: true } },
        },
      },
    },
  });

  const TYPE_LABEL: Record<string, string> = {
    RETURN: 'Devolución', SIZE_EXCHANGE: 'Cambio talla',
    PRODUCT_EXCHANGE: 'Cambio producto', DEFECTIVE: 'Defectuoso',
    WARRANTY: 'Garantía', KYZZ_ERROR: 'Error KYZZ',
  };

  const REASON_LABEL: Record<string, string> = {
    WRONG_SIZE: 'Talla incorrecta', CHANGED_MIND: 'Cambió de opinión',
    NOT_AS_DESCRIBED: 'No coincide descripción', DEFECTIVE: 'Defecto fabricación',
    DAMAGED_IN_TRANSIT: 'Daño en tránsito', WRONG_ITEM_SENT: 'Producto incorrecto',
    QUALITY_ISSUE: 'Problema calidad', OTHER: 'Otro',
  };

  // Helper: escapa un valor CSV (comillas si contiene coma, salto, o comilla)
  const esc = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('\n') || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const fmt = (n: number | null | undefined) =>
    n != null ? n.toFixed(0) : '';

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(d);

  const headers = [
    'RMA', 'Fecha creación', 'Última actualización',
    'Estado', 'Tipo', 'Motivo categorizado', 'Motivo (texto libre)',
    'Cliente', 'Email', 'Ciudad', 'Canal', 'Pago',
    'Total pedido (COP)', 'Paga flete', 'Transportadora regreso', 'N° guía regreso',
    'Costo flete (COP)', 'Monto reembolso (COP)', 'Método reembolso', 'Estado reembolso',
    'Condición inspección', 'ID Pedido',
  ];

  const rows = returns.map((r) => [
    esc(r.rmaCode),
    esc(fmtDate(r.createdAt)),
    esc(fmtDate(r.updatedAt)),
    esc(r.status),
    esc(TYPE_LABEL[r.requestType ?? ''] ?? r.requestType),
    esc(REASON_LABEL[r.reasonCategory ?? ''] ?? r.reasonCategory),
    esc(r.reason),
    esc(r.order.user?.name ?? r.order.guestEmail),
    esc(r.order.user?.email ?? r.order.guestEmail),
    esc(r.order.OrderAddress?.city),
    esc(r.order.channel),
    esc(r.order.paymentMethod),
    esc(fmt(r.order.total)),
    esc(r.whoPayShipping),
    esc(r.returnCarrier),
    esc(r.returnTrackingCode),
    esc(fmt(r.returnShippingCost)),
    esc(fmt(r.refundAmount)),
    esc(r.refundMethod),
    esc(r.refundStatus),
    esc(r.itemCondition),
    esc(r.order.id),
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\r\n');
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="devoluciones-kyzz-${today}.csv"`,
    },
  });
}
