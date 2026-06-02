import Link from 'next/link';
import { titleFont } from '@/config/fonts';
import { currencyFormat } from '@/utils';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import type { ReturnStatus, PostSaleType } from '@prisma/client';

// ─── Labels ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  RETURN: 'Devolución', SIZE_EXCHANGE: 'Cambio de talla',
  PRODUCT_EXCHANGE: 'Cambio de producto', DEFECTIVE: 'Defectuoso',
  WARRANTY: 'Garantía', KYZZ_ERROR: 'Error KYZZ',
};

const REASON_LABEL: Record<string, string> = {
  WRONG_SIZE:          'Talla incorrecta',
  CHANGED_MIND:        'Cambió de opinión',
  NOT_AS_DESCRIBED:    'No coincide con la descripción',
  DEFECTIVE:           'Defecto de fabricación',
  DAMAGED_IN_TRANSIT:  'Daño en tránsito',
  WRONG_ITEM_SENT:     'Producto incorrecto enviado',
  QUALITY_ISSUE:       'Problema de calidad',
  OTHER:               'Otro',
};

const STATUS_LABEL: Partial<Record<ReturnStatus, string>> = {
  PENDING: 'En revisión', EVIDENCE_REQUIRED: 'Pendiente evidencia',
  APPROVED: 'Aprobada', GUIDE_SENT: 'Guía enviada',
  IN_TRANSIT: 'En tránsito', RECEIVED: 'Recibida',
  INSPECTING: 'En inspección', ACCEPTED: 'Aceptada',
  PROCESSING: 'Procesando', COMPLETED: 'Completada',
  REJECTED: 'Rechazada', REJECTED_AFTER_INSPECT: 'Rechazada (inspección)',
  CLOSED: 'Cerrada',
};

const STATUS_DOT: Partial<Record<ReturnStatus, string>> = {
  PENDING: 'bg-amber-400', EVIDENCE_REQUIRED: 'bg-amber-400',
  APPROVED: 'bg-blue-400', GUIDE_SENT: 'bg-blue-400',
  IN_TRANSIT: 'bg-sky-500', RECEIVED: 'bg-sky-500',
  INSPECTING: 'bg-violet-400', ACCEPTED: 'bg-emerald-400',
  PROCESSING: 'bg-emerald-500', COMPLETED: 'bg-kyzz-primary',
  REJECTED: 'bg-red-400', REJECTED_AFTER_INSPECT: 'bg-red-400',
  CLOSED: 'bg-kyzz-muted',
};

// ─── Queries ───────────────────────────────────────────────────────────────

async function getSummary() {
  const now           = new Date();
  const sixMonthsAgo  = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalCount,
    byStatus,
    byType,
    byReason,
    completedReturns,
    refundAgg,
    shippingAgg,
    recentReturns,
  ] = await Promise.all([
    prisma.returnRequest.count(),
    prisma.returnRequest.groupBy({ by: ['status'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.returnRequest.groupBy({ by: ['requestType'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.returnRequest.groupBy({
      by: ['reasonCategory'],
      where: { reasonCategory: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.returnRequest.findMany({
      where:  { status: 'COMPLETED' },
      select: { createdAt: true, updatedAt: true },
    }),
    prisma.returnRequest.aggregate({ where: { refundAmount: { gt: 0 } },       _sum: { refundAmount: true } }),
    prisma.returnRequest.aggregate({ where: { returnShippingCost: { gt: 0 } }, _sum: { returnShippingCost: true } }),
    prisma.returnRequest.findMany({
      where:  { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    }),
  ]);

  // Tiempo promedio de resolución (días)
  const avgResolutionDays = completedReturns.length > 0
    ? completedReturns.reduce((s, r) => s + (r.updatedAt.getTime() - r.createdAt.getTime()), 0)
      / completedReturns.length / 86_400_000
    : null;

  // Tendencia mensual (últimos 6 meses)
  const MONTH_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const monthBuckets = new Map<string, { label: string; count: number }>();
  for (let i = 5; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthBuckets.set(key, { label: `${MONTH_ES[d.getMonth()]} ${d.getFullYear()}`, count: 0 });
  }
  for (const r of recentReturns) {
    const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`;
    const bucket = monthBuckets.get(key);
    if (bucket) bucket.count++;
  }

  return {
    totalCount,
    completedCount:    completedReturns.length,
    byStatus,
    byType,
    byReason,
    avgResolutionDays,
    refundTotal:       refundAgg._sum.refundAmount    ?? 0,
    shippingTotal:     shippingAgg._sum.returnShippingCost ?? 0,
    monthlyTrend:      Array.from(monthBuckets.values()),
  };
}

const RETURN_RATE_THRESHOLD = 15; // % — alerta visual

async function getProductReturnRates() {
  // Solicitudes activas (excluye rechazadas y cerradas sin procesar)
  const activeReturns = await prisma.returnRequest.findMany({
    where:  { status: { notIn: ['REJECTED', 'CLOSED', 'REJECTED_AFTER_INSPECT'] } },
    select: {
      order: {
        select: {
          OrderItem: {
            select: {
              productId: true,
              quantity:  true,
              product:   { select: { title: true } },
            },
          },
        },
      },
    },
  });

  // Agrupar unidades devueltas por producto
  const returnedMap = new Map<string, { title: string; returned: number }>();
  for (const ret of activeReturns) {
    for (const item of ret.order.OrderItem) {
      const cur = returnedMap.get(item.productId);
      if (cur) {
        cur.returned += item.quantity;
      } else {
        returnedMap.set(item.productId, { title: item.product.title, returned: item.quantity });
      }
    }
  }

  if (returnedMap.size === 0) return [];

  // Total vendido por los mismos productos
  const soldGroups = await prisma.orderItem.groupBy({
    by:    ['productId'],
    where: { productId: { in: Array.from(returnedMap.keys()) }, order: { isPaid: true } },
    _sum:  { quantity: true },
  });

  return soldGroups
    .map((s) => {
      const meta    = returnedMap.get(s.productId);
      const sold    = s._sum.quantity ?? 0;
      const returned = meta?.returned ?? 0;
      const rate    = sold > 0 ? (returned / sold) * 100 : 0;
      return { productId: s.productId, title: meta?.title ?? '—', sold, returned, rate };
    })
    .filter((p) => p.returned > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function ReturnAnalyticsPage() {
  const session = await auth();
  if (session?.user.role !== 'admin') redirect('/auth/login');

  const [summary, productRates] = await Promise.all([getSummary(), getProductReturnRates()]);

  const {
    totalCount, completedCount, byStatus, byType, byReason,
    avgResolutionDays, refundTotal, shippingTotal, monthlyTrend,
  } = summary;

  const resolutionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const maxMonth       = Math.max(...monthlyTrend.map((m) => m.count), 1);
  const maxType        = Math.max(...byType.map((t) => t._count.id), 1);
  const maxReason      = Math.max(...byReason.map((r) => r._count.id), 1);
  const maxRate        = Math.max(...productRates.map((p) => p.rate), 1);

  return (
    <div>
      {/* Cabecera */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin/devoluciones" className="text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors">
              ← Devoluciones
            </Link>
          </div>
          <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>Analytics</h1>
          <div className="w-6 h-px bg-kyzz-secondary mt-3" />
        </div>
        <a
          href="/api/admin/returns/export"
          className="text-[10px] tracking-widests uppercase px-4 py-2.5 border border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary transition-colors"
        >
          Exportar CSV →
        </a>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Total solicitudes',
            value: totalCount,
            sub:   null,
          },
          {
            label: 'Resueltas',
            value: `${resolutionRate.toFixed(0)}%`,
            sub:   `${completedCount} completadas`,
          },
          {
            label: 'Tiempo promedio',
            value: avgResolutionDays !== null ? `${avgResolutionDays.toFixed(1)}d` : '—',
            sub:   'desde solicitud a cierre',
          },
          {
            label: 'Costo total',
            value: currencyFormat(refundTotal + shippingTotal),
            sub:   `${currencyFormat(refundTotal)} reembolsos · ${currencyFormat(shippingTotal)} fletes`,
          },
        ].map(({ label, value, sub }) => (
          <div key={label} className="kyzz-panel p-6">
            <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-1">{label}</p>
            <p className={`${titleFont.className} text-3xl text-kyzz-dark`}>{value}</p>
            {sub && <p className="text-[10px] text-kyzz-muted mt-1 leading-snug">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Tendencia mensual + Distribución por estado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Tendencia */}
        <div className="kyzz-panel p-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted mb-6">
            Solicitudes · últimos 6 meses
          </h2>
          {totalCount === 0 ? (
            <p className="text-sm text-kyzz-muted py-8 text-center">Sin datos aún.</p>
          ) : (
            <div className="flex items-end justify-between gap-2 h-28">
              {monthlyTrend.map((m) => (
                <div key={m.label} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] text-kyzz-dark mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.count}
                  </span>
                  <div
                    className="w-full max-w-[32px] bg-kyzz-secondary group-hover:bg-kyzz-primary transition-colors rounded-t-sm"
                    style={{ height: `${Math.max((m.count / maxMonth) * 96, m.count > 0 ? 4 : 0)}px` }}
                  />
                  <span className="text-[9px] text-kyzz-muted mt-2 text-center leading-tight">
                    {m.label.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Por estado */}
        <div className="kyzz-panel p-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted mb-5">
            Por estado
          </h2>
          {byStatus.length === 0 ? (
            <p className="text-sm text-kyzz-muted py-4">Sin datos aún.</p>
          ) : (
            <div className="space-y-2.5">
              {byStatus.slice(0, 8).map((s) => {
                const status = s.status as ReturnStatus;
                const pct    = totalCount > 0 ? (s._count.id / totalCount) * 100 : 0;
                return (
                  <div key={s.status} className="flex items-center gap-3">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[status] ?? 'bg-kyzz-muted'}`} />
                    <span className="text-[11px] text-kyzz-muted w-36 shrink-0 truncate">
                      {STATUS_LABEL[status] ?? s.status}
                    </span>
                    <div className="flex-1 h-1 bg-kyzz-tertiary rounded-full overflow-hidden">
                      <div className="h-full bg-kyzz-secondary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] text-kyzz-dark w-6 text-right shrink-0">{s._count.id}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Por tipo + Por motivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Por tipo */}
        <div className="kyzz-panel p-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted mb-5">
            Por tipo de solicitud
          </h2>
          {byType.length === 0 ? (
            <p className="text-sm text-kyzz-muted py-4">Sin datos aún.</p>
          ) : (
            <div className="space-y-3">
              {byType.map((t) => {
                const label = TYPE_LABEL[t.requestType as PostSaleType] ?? t.requestType ?? '—';
                const pct   = (t._count.id / maxType) * 100;
                return (
                  <div key={String(t.requestType)}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-kyzz-dark">{label}</span>
                      <span className="text-kyzz-muted">{t._count.id}</span>
                    </div>
                    <div className="h-1.5 bg-kyzz-tertiary rounded-full overflow-hidden">
                      <div className="h-full bg-kyzz-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Por motivo */}
        <div className="kyzz-panel p-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted mb-5">
            Por motivo categorizado
          </h2>
          {byReason.length === 0 ? (
            <p className="text-sm text-kyzz-muted py-4">Sin motivos categorizados aún.</p>
          ) : (
            <div className="space-y-3">
              {byReason.map((r) => {
                const label = REASON_LABEL[r.reasonCategory ?? ''] ?? r.reasonCategory ?? '—';
                const pct   = (r._count.id / maxReason) * 100;
                return (
                  <div key={String(r.reasonCategory)}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-kyzz-dark">{label}</span>
                      <span className="text-kyzz-muted">{r._count.id}</span>
                    </div>
                    <div className="h-1.5 bg-kyzz-tertiary rounded-full overflow-hidden">
                      <div className="h-full bg-kyzz-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tasa de devolución por producto */}
      <div className="kyzz-panel p-6 mb-6">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted">
            Tasa de devolución por producto
          </h2>
          <p className="text-[10px] text-kyzz-muted">
            Alerta si supera {RETURN_RATE_THRESHOLD}%
          </p>
        </div>

        {productRates.length === 0 ? (
          <p className="text-sm text-kyzz-muted py-4 text-center">Sin devoluciones registradas aún.</p>
        ) : (
          <div className="space-y-4">
            {productRates.map((p) => {
              const isAlert = p.rate >= RETURN_RATE_THRESHOLD;
              return (
                <div key={p.productId}>
                  <div className="flex items-center justify-between text-[12px] mb-1 gap-2">
                    <span className={`truncate ${isAlert ? 'text-red-600 font-medium' : 'text-kyzz-dark'}`}>
                      {isAlert && <span className="mr-1" title="Supera el 15%">⚠</span>}
                      {p.title}
                    </span>
                    <span className={`shrink-0 font-medium ${isAlert ? 'text-red-500' : 'text-kyzz-muted'}`}>
                      {p.rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-kyzz-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isAlert ? 'bg-red-400' : 'bg-kyzz-secondary'}`}
                      style={{ width: `${Math.min((p.rate / maxRate) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-kyzz-muted mt-0.5">
                    {p.returned} devueltas de {p.sold} vendidas
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Costos desglosados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="kyzz-panel p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-1">Reembolsos pagados</p>
          <p className={`${titleFont.className} text-3xl text-kyzz-dark`}>{currencyFormat(refundTotal)}</p>
          <p className="text-[10px] text-kyzz-muted mt-1">Solo solicitudes con refundAmount registrado</p>
        </div>
        <div className="kyzz-panel p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-1">Fletes de devolución</p>
          <p className={`${titleFont.className} text-3xl text-kyzz-dark`}>{currencyFormat(shippingTotal)}</p>
          <p className="text-[10px] text-kyzz-muted mt-1">Solo solicitudes con returnShippingCost registrado</p>
        </div>
      </div>
    </div>
  );
}
