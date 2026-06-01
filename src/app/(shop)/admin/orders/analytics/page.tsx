export const revalidate = 0;

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { titleFont } from '@/config/fonts';
import { currencyFormat } from '@/utils';
import prisma from '@/lib/prisma';

// ─── Helpers de período ────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | 'all';
const VALID_PERIODS: Period[] = ['7d', '30d', '90d', 'all'];

function sinceDate(period: Period): Date {
  if (period === 'all') return new Date(0);
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 86_400_000);
}

const PERIOD_LABEL: Record<Period, string> = {
  '7d': 'Últimos 7 días', '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días', 'all': 'Todo el tiempo',
};

const MONTH_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const cotDate  = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' });

// ─── Queries ───────────────────────────────────────────────────────────────

async function getOrderAnalytics(period: Period) {
  const since = sinceDate(period);
  const baseWhere = { createdAt: { gte: since } };
  const paidWhere = { isPaid: true, paidAt: { gte: since } };

  // ── Paralelo 1: conteos y agregados principales ──────────────────────────
  const [
    totalOrders,
    paidAgg,
    cancelledCount,
    unpaidActive,
    byChannel,
    byPaymentMethod,
    byShippingStatus,
    guestOrderCount,
    couponOrderCount,
    couponDiscountAgg,
    codConfirmedCount,
    codDeliveredCount,
    codCancelledCount,
  ] = await Promise.all([
    prisma.order.count({ where: baseWhere }),
    prisma.order.aggregate({ where: paidWhere, _sum: { total: true }, _count: { id: true }, _avg: { total: true } }),
    prisma.order.count({ where: { cancelledAt: { not: null }, ...baseWhere } }),
    prisma.order.count({ where: { isPaid: false, cancelledAt: null, ...baseWhere } }),
    prisma.order.groupBy({ by: ['channel'], where: paidWhere, _sum: { total: true }, _count: true, _avg: { total: true }, orderBy: { _sum: { total: 'desc' } } }),
    prisma.order.groupBy({ by: ['paymentMethod'], where: baseWhere, _count: true }),
    prisma.order.groupBy({ by: ['shippingStatus'], where: { cancelledAt: null, ...baseWhere }, _count: true }),
    prisma.order.count({ where: { userId: null, ...baseWhere } }),
    prisma.order.count({ where: { couponCode: { not: null }, ...baseWhere } }),
    prisma.order.aggregate({ where: { couponDiscount: { gt: 0 }, ...baseWhere }, _sum: { couponDiscount: true } }),
    prisma.order.count({ where: { paymentMethod: 'cod', codConfirmedAt: { not: null }, ...baseWhere } }),
    prisma.order.count({ where: { paymentMethod: 'cod', shippingStatus: 'delivered', ...baseWhere } }),
    prisma.order.count({ where: { paymentMethod: 'cod', cancelledAt: { not: null }, ...baseWhere } }),
  ]);

  // ── Paralelo 2: datos que requieren procesamiento ────────────────────────
  const [shippedOrders, allOrderItems, topCoupons, customerGroups, trendOrders] = await Promise.all([
    // Tiempo promedio de despacho (paidAt → shippedAt)
    prisma.order.findMany({
      where:   { shippedAt: { not: null }, paidAt: { not: null, gte: since } },
      select:  { paidAt: true, shippedAt: true },
      take:    500,
      orderBy: { shippedAt: 'desc' },
    }),
    // Top productos
    prisma.orderItem.findMany({
      where:  { order: paidWhere },
      select: {
        productId: true, price: true, quantity: true,
        product:   { select: { title: true, slug: true } },
      },
    }),
    // Top cupones
    prisma.order.groupBy({
      by:      ['couponCode'],
      where:   { couponCode: { not: null }, ...baseWhere },
      _count:  { id: true },
      _sum:    { couponDiscount: true },
      orderBy: { _count: { id: 'desc' } },
      take:    6,
    }),
    // Clientes recurrentes vs nuevos
    prisma.order.groupBy({
      by:    ['userId'],
      where: { isPaid: true, userId: { not: null }, paidAt: { gte: since } },
      _count: { id: true },
    }),
    // Tendencia: revenue por día (7d/30d) o por mes (90d/all)
    prisma.order.findMany({
      where:   paidWhere,
      select:  { paidAt: true, total: true },
    }),
  ]);

  // ── Tiempo promedio de despacho ──────────────────────────────────────────
  const avgDispatchHours = shippedOrders.length > 0
    ? shippedOrders.reduce((s, o) => s + (o.shippedAt!.getTime() - o.paidAt!.getTime()), 0)
      / shippedOrders.length / 3_600_000
    : null;

  // ── Top productos por revenue ────────────────────────────────────────────
  const productMap = new Map<string, { title: string; slug: string; revenue: number; units: number }>();
  for (const item of allOrderItems) {
    const cur = productMap.get(item.productId);
    const lineRevenue = item.price * item.quantity;
    if (cur) { cur.revenue += lineRevenue; cur.units += item.quantity; }
    else { productMap.set(item.productId, { title: item.product.title, slug: item.product.slug, revenue: lineRevenue, units: item.quantity }); }
  }
  const topByRevenue = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  const topByUnits   = Array.from(productMap.values()).sort((a, b) => b.units   - a.units).slice(0, 8);

  // ── Clientes recurrentes ─────────────────────────────────────────────────
  const uniqueCustomers  = customerGroups.length;
  const repeatCustomers  = customerGroups.filter((g) => g._count.id > 1).length;

  // ── Tendencia ────────────────────────────────────────────────────────────
  let trend: { label: string; revenue: number }[] = [];
  if (period === '7d' || period === '30d') {
    const days = period === '7d' ? 7 : 30;
    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      buckets.set(cotDate.format(d), 0);
    }
    for (const o of trendOrders) {
      if (!o.paidAt) continue;
      const key = cotDate.format(o.paidAt);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + o.total);
    }
    trend = Array.from(buckets.entries()).map(([day, revenue]) => ({
      label: day.slice(5), // MM-DD
      revenue,
    }));
  } else {
    const months = period === '90d' ? 3 : 12;
    const now    = new Date();
    const buckets = new Map<string, { label: string; revenue: number }>();
    for (let i = months - 1; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, { label: `${MONTH_ES[d.getMonth()]}`, revenue: 0 });
    }
    for (const o of trendOrders) {
      if (!o.paidAt) continue;
      const d   = o.paidAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const b   = buckets.get(key);
      if (b) b.revenue += o.total;
    }
    trend = Array.from(buckets.values());
  }

  // ── KPIs derivados ───────────────────────────────────────────────────────
  const paidCount        = paidAgg._count.id;
  const revenueTotal     = paidAgg._sum.total ?? 0;
  const aov              = paidAgg._avg.total ?? 0;
  const nonCancelledTotal = totalOrders - cancelledCount;
  const conversionRate   = nonCancelledTotal > 0 ? (paidCount / nonCancelledTotal) * 100 : 0;
  const cancellationRate = totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0;
  const codCount         = byPaymentMethod.find((m) => m.paymentMethod === 'cod')?._count ?? 0;
  const codRejectionRate = codCount > 0 ? (codCancelledCount / codCount) * 100 : 0;
  const deliveredCount   = byShippingStatus.find((s) => s.shippingStatus === 'delivered')?._count ?? 0;
  const shippedTotal     = (byShippingStatus.find((s) => s.shippingStatus === 'shipped')?._count ?? 0) + deliveredCount;
  const deliveryRate     = shippedTotal > 0 ? (deliveredCount / shippedTotal) * 100 : 0;
  const channelTotal     = byChannel.reduce((s, c) => s + (c._sum.total ?? 0), 0);
  const topRevenue       = Math.max(...topByRevenue.map((p) => p.revenue), 1);
  const topUnits         = Math.max(...topByUnits.map((p) => p.units), 1);
  const maxTrend         = Math.max(...trend.map((t) => t.revenue), 1);

  const shippingFunnelSteps = [
    { label: 'Pagados',     count: paidCount },
    { label: 'En proceso',  count: byShippingStatus.find((s) => s.shippingStatus === 'processing')?._count ?? 0 },
    { label: 'Enviados',    count: shippedTotal },
    { label: 'Entregados',  count: deliveredCount },
  ];
  const maxFunnel = Math.max(...shippingFunnelSteps.map((s) => s.count), 1);

  return {
    totalOrders, paidCount, cancelledCount, unpaidActive,
    revenueTotal, aov, conversionRate, cancellationRate, deliveryRate,
    avgDispatchHours, byChannel, byPaymentMethod, byShippingStatus,
    guestOrderCount, uniqueCustomers, repeatCustomers,
    couponOrderCount, couponDiscountAgg, topCoupons,
    topByRevenue, topByUnits, topRevenue, topUnits,
    codCount, codConfirmedCount, codDeliveredCount, codCancelledCount, codRejectionRate,
    shippingFunnelSteps, maxFunnel, channelTotal,
    trend, maxTrend,
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────

const CHANNEL_LABEL: Record<string, string> = {
  web: 'Web', whatsapp: 'WhatsApp', instagram: 'Instagram', other: 'Otro',
};
const CHANNEL_COLOR: Record<string, string> = {
  web: 'bg-kyzz-primary', whatsapp: 'bg-emerald-500',
  instagram: 'bg-purple-500', other: 'bg-kyzz-muted',
};

interface Props {
  searchParams: Promise<{ period?: string }>;
}

export default async function OrderAnalyticsPage({ searchParams }: Props) {
  const session = await auth();
  if (session?.user.role !== 'admin') redirect('/auth/login');

  const params = await searchParams;
  const period = (VALID_PERIODS.includes(params.period as Period) ? params.period : '30d') as Period;

  const d = await getOrderAnalytics(period);

  return (
    <div>

      {/* Cabecera + selector de período */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin/orders" className="text-[10px] tracking-widests uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors">
              ← Pedidos
            </Link>
          </div>
          <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>Analytics de Pedidos</h1>
          <div className="w-6 h-px bg-kyzz-secondary mt-3" />
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/api/admin/orders/export?period=${period}`}
            className="text-[10px] tracking-widests uppercase px-4 py-2.5 border border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary transition-colors"
          >
            Exportar CSV →
          </a>

        {/* Selector de período */}
        <div className="flex items-center gap-1 border border-kyzz-secondary p-0.5">
          {VALID_PERIODS.map((p) => (
            <Link
              key={p}
              href={`?period=${p}`}
              className={`px-3 py-1.5 text-[10px] tracking-widests uppercase transition-colors ${
                period === p
                  ? 'bg-kyzz-dark text-white'
                  : 'text-kyzz-muted hover:text-kyzz-primary'
              }`}
            >
              {p === 'all' ? 'Todo' : p}
            </Link>
          ))}
        </div>
        </div>
      </div>

      <p className="text-[11px] tracking-widests uppercase text-kyzz-muted mb-6">
        {PERIOD_LABEL[period]}
      </p>

      {/* ── KPIs Fila 1: Revenue y conversión ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="kyzz-panel p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-1">Ingresos</p>
          <p className={`${titleFont.className} text-3xl text-kyzz-dark`}>{currencyFormat(d.revenueTotal)}</p>
          <p className="text-[10px] text-kyzz-muted mt-1">{d.paidCount} pedidos pagados</p>
        </div>
        <div className="kyzz-panel p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-1">Ticket promedio</p>
          <p className={`${titleFont.className} text-3xl text-kyzz-dark`}>{currencyFormat(d.aov)}</p>
          <p className="text-[10px] text-kyzz-muted mt-1">AOV en pedidos pagados</p>
        </div>
        <div className="kyzz-panel p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-1">Tasa de pago</p>
          <p className={`${titleFont.className} text-3xl ${d.conversionRate < 50 ? 'text-red-500' : 'text-kyzz-dark'}`}>
            {d.conversionRate.toFixed(1)}%
          </p>
          <p className="text-[10px] text-kyzz-muted mt-1">{d.paidCount} de {d.totalOrders - d.cancelledCount} activos</p>
        </div>
        <div className="kyzz-panel p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-1">Sin pagar (activos)</p>
          <p className={`${titleFont.className} text-3xl ${d.unpaidActive > 0 ? 'text-amber-600' : 'text-kyzz-dark'}`}>
            {d.unpaidActive}
          </p>
          <p className="text-[10px] text-kyzz-muted mt-1">Pendientes de pago</p>
        </div>
      </div>

      {/* ── KPIs Fila 2: Operaciones ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="kyzz-panel p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-1">Total pedidos</p>
          <p className={`${titleFont.className} text-3xl text-kyzz-dark`}>{d.totalOrders}</p>
          <p className="text-[10px] text-kyzz-muted mt-1">{d.cancelledCount} cancelados</p>
        </div>
        <div className="kyzz-panel p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-1">Tasa de cancelación</p>
          <p className={`${titleFont.className} text-3xl ${d.cancellationRate > 15 ? 'text-red-500' : 'text-kyzz-dark'}`}>
            {d.cancellationRate.toFixed(1)}%
          </p>
          <p className="text-[10px] text-kyzz-muted mt-1">{d.cancelledCount} de {d.totalOrders} totales</p>
        </div>
        <div className="kyzz-panel p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-1">Tiempo de despacho</p>
          <p className={`${titleFont.className} text-3xl text-kyzz-dark`}>
            {d.avgDispatchHours !== null
              ? d.avgDispatchHours < 24
                ? `${d.avgDispatchHours.toFixed(0)}h`
                : `${(d.avgDispatchHours / 24).toFixed(1)}d`
              : '—'}
          </p>
          <p className="text-[10px] text-kyzz-muted mt-1">Pago → envío promedio</p>
        </div>
        <div className="kyzz-panel p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-1">Tasa de entrega</p>
          <p className={`${titleFont.className} text-3xl ${d.deliveryRate < 70 && d.deliveryRate > 0 ? 'text-amber-600' : 'text-kyzz-dark'}`}>
            {d.deliveryRate > 0 ? `${d.deliveryRate.toFixed(1)}%` : '—'}
          </p>
          <p className="text-[10px] text-kyzz-muted mt-1">{d.shippingFunnelSteps.find(s=>s.label==='Entregados')?.count ?? 0} entregados de {d.shippingFunnelSteps.find(s=>s.label==='Enviados')?.count ?? 0} enviados</p>
        </div>
      </div>

      {/* ── Tendencia de ingresos ─────────────────────────────────────────── */}
      <div className="kyzz-panel p-6 mb-6">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted">
            Ingresos · {PERIOD_LABEL[period].toLowerCase()}
          </h2>
          <p className="text-[11px] tracking-wide text-kyzz-muted">{currencyFormat(d.revenueTotal)} total</p>
        </div>
        {d.revenueTotal === 0 ? (
          <p className="text-sm text-kyzz-muted py-8 text-center">Sin ingresos en el período.</p>
        ) : (
          <div className="flex items-end justify-between gap-0.5 h-36">
            {d.trend.map((t) => (
              <div key={t.label} className="flex-1 flex flex-col items-center justify-end h-full group">
                <span className="text-[9px] text-kyzz-dark mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {currencyFormat(t.revenue)}
                </span>
                <div
                  className="w-full max-w-[24px] bg-kyzz-secondary group-hover:bg-kyzz-primary transition-colors rounded-t-sm"
                  style={{ height: `${Math.max((t.revenue / d.maxTrend) * 120, t.revenue > 0 ? 4 : 0)}px` }}
                  title={`${t.label}: ${currencyFormat(t.revenue)}`}
                />
                {d.trend.length <= 30 && (
                  <span className="text-[8px] text-kyzz-muted mt-1.5 rotate-0">
                    {d.trend.length <= 14 ? t.label.slice(3) : t.label.slice(3)}
                  </span>
                )}
                {d.trend.length > 30 && (
                  <span className="text-[9px] text-kyzz-muted mt-1.5">{t.label}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Funnel de envío + Canal ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Funnel */}
        <div className="kyzz-panel p-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted mb-6">Funnel de pedidos</h2>
          <div className="space-y-3">
            {d.shippingFunnelSteps.map((step, i) => {
              const pct = (step.count / d.maxFunnel) * 100;
              const dropPct = i > 0 && d.shippingFunnelSteps[i-1].count > 0
                ? ((d.shippingFunnelSteps[i-1].count - step.count) / d.shippingFunnelSteps[i-1].count) * 100
                : null;
              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 flex items-center justify-center text-[9px] text-kyzz-muted">{i + 1}</span>
                      <span className="text-kyzz-dark">{step.label}</span>
                      {dropPct !== null && dropPct > 0 && (
                        <span className="text-[10px] text-kyzz-muted">
                          (−{dropPct.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                    <span className={`font-medium ${i === d.shippingFunnelSteps.length - 1 ? 'text-emerald-600' : 'text-kyzz-dark'}`}>
                      {step.count}
                    </span>
                  </div>
                  <div className="h-2 bg-kyzz-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${i === d.shippingFunnelSteps.length - 1 ? 'bg-emerald-400' : 'bg-kyzz-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Canal */}
        <div className="kyzz-panel p-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted mb-6">Ingresos por canal</h2>
          {d.byChannel.length === 0 ? (
            <p className="text-sm text-kyzz-muted py-4">Sin pedidos pagados aún.</p>
          ) : (
            <div className="space-y-4">
              {d.byChannel.map((c) => {
                const revenue = c._sum.total ?? 0;
                const pct     = d.channelTotal > 0 ? (revenue / d.channelTotal) * 100 : 0;
                const avgVal  = c._avg.total ?? 0;
                return (
                  <div key={c.channel}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${CHANNEL_COLOR[c.channel] ?? 'bg-kyzz-muted'}`} />
                        <span className="text-kyzz-dark">{CHANNEL_LABEL[c.channel] ?? c.channel}</span>
                        <span className="text-kyzz-muted text-[10px]">{c._count} ped.</span>
                      </div>
                      <div className="text-right">
                        <span className="text-kyzz-dark">{currencyFormat(revenue)}</span>
                        <span className="text-kyzz-muted ml-2 text-[10px]">AOV {currencyFormat(avgVal)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-kyzz-tertiary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${CHANNEL_COLOR[c.channel] ?? 'bg-kyzz-primary'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Método de pago + Clientes ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Método de pago + COD detail */}
        <div className="kyzz-panel p-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted mb-5">Método de pago</h2>
          <div className="grid grid-cols-2 gap-4 mb-5">
            {d.byPaymentMethod.map((m) => (
              <div key={m.paymentMethod}>
                <p className="text-[10px] tracking-widests uppercase text-kyzz-muted">
                  {m.paymentMethod === 'cod' ? 'Contraentrega' : 'Pago online'}
                </p>
                <p className={`${titleFont.className} text-2xl text-kyzz-dark mt-0.5`}>{m._count}</p>
                <p className="text-[10px] text-kyzz-muted">
                  {d.totalOrders > 0 ? `${((m._count / d.totalOrders) * 100).toFixed(0)}%` : '—'} del total
                </p>
              </div>
            ))}
          </div>

          {d.codCount > 0 && (
            <>
              <div className="border-t border-kyzz-secondary pt-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-3">Salud contraentrega</p>
                <div className="grid grid-cols-2 gap-3 text-center">
                  {[
                    { label: 'Creados',    value: d.codCount },
                    { label: 'Confirmados', value: d.codConfirmedCount },
                    { label: 'Entregados', value: d.codDeliveredCount },
                    { label: 'Cancelados', value: d.codCancelledCount },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-kyzz-tertiary p-3">
                      <p className="text-[10px] text-kyzz-muted">{label}</p>
                      <p className={`${titleFont.className} text-xl text-kyzz-dark`}>{value}</p>
                    </div>
                  ))}
                </div>
                <p className={`text-[11px] tracking-wide mt-3 ${d.codRejectionRate > 20 ? 'text-red-500' : 'text-kyzz-muted'}`}>
                  Tasa de cancelación COD: {d.codRejectionRate.toFixed(1)}%
                  {d.codRejectionRate > 20 && ' ⚠ Alta'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Clientes */}
        <div className="kyzz-panel p-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted mb-5">Clientes</h2>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <p className="text-[10px] tracking-widests uppercase text-kyzz-muted">Registradas</p>
              <p className={`${titleFont.className} text-2xl text-kyzz-dark mt-0.5`}>{d.totalOrders - d.guestOrderCount}</p>
              <p className="text-[10px] text-kyzz-muted">
                {d.totalOrders > 0 ? `${(((d.totalOrders - d.guestOrderCount) / d.totalOrders) * 100).toFixed(0)}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-widests uppercase text-kyzz-muted">Invitadas</p>
              <p className={`${titleFont.className} text-2xl text-kyzz-dark mt-0.5`}>{d.guestOrderCount}</p>
              <p className="text-[10px] text-kyzz-muted">
                {d.totalOrders > 0 ? `${((d.guestOrderCount / d.totalOrders) * 100).toFixed(0)}%` : '—'}
              </p>
            </div>
          </div>

          <div className="border-t border-kyzz-secondary pt-4">
            <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-3">Fidelización</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] tracking-widests uppercase text-kyzz-muted">Clientes únicos</p>
                <p className={`${titleFont.className} text-2xl text-kyzz-dark mt-0.5`}>{d.uniqueCustomers}</p>
                <p className="text-[10px] text-kyzz-muted">con sesión</p>
              </div>
              <div>
                <p className="text-[10px] tracking-widests uppercase text-kyzz-muted">Recurrentes</p>
                <p className={`${titleFont.className} text-2xl text-emerald-600 mt-0.5`}>{d.repeatCustomers}</p>
                <p className="text-[10px] text-kyzz-muted">
                  {d.uniqueCustomers > 0 ? `${((d.repeatCustomers / d.uniqueCustomers) * 100).toFixed(0)}%` : '—'} del total
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top productos ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Por revenue */}
        <div className="kyzz-panel p-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted mb-5">
            Top productos · por revenue
          </h2>
          {d.topByRevenue.length === 0 ? (
            <p className="text-sm text-kyzz-muted py-4">Sin ventas en el período.</p>
          ) : (
            <ol className="space-y-3">
              {d.topByRevenue.map((p, i) => (
                <li key={p.slug} className="flex items-center gap-3">
                  <span className={`${titleFont.className} text-base text-kyzz-secondary w-4 shrink-0`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/admin/product/${p.slug}`}
                      className="text-sm text-kyzz-dark hover:text-kyzz-primary transition-colors truncate block">
                      {p.title}
                    </Link>
                    <div className="mt-1 h-1 bg-kyzz-tertiary rounded-full overflow-hidden">
                      <div className="h-full bg-kyzz-primary" style={{ width: `${(p.revenue / d.topRevenue) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-medium text-kyzz-dark block">{currencyFormat(p.revenue)}</span>
                    <span className="text-[10px] text-kyzz-muted">{p.units} uds.</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Por unidades */}
        <div className="kyzz-panel p-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted mb-5">
            Top productos · por unidades vendidas
          </h2>
          {d.topByUnits.length === 0 ? (
            <p className="text-sm text-kyzz-muted py-4">Sin ventas en el período.</p>
          ) : (
            <ol className="space-y-3">
              {d.topByUnits.map((p, i) => (
                <li key={p.slug} className="flex items-center gap-3">
                  <span className={`${titleFont.className} text-base text-kyzz-secondary w-4 shrink-0`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/admin/product/${p.slug}`}
                      className="text-sm text-kyzz-dark hover:text-kyzz-primary transition-colors truncate block">
                      {p.title}
                    </Link>
                    <div className="mt-1 h-1 bg-kyzz-tertiary rounded-full overflow-hidden">
                      <div className="h-full bg-kyzz-primary" style={{ width: `${(p.units / d.topUnits) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-medium text-kyzz-dark block">{p.units} uds.</span>
                    <span className="text-[10px] text-kyzz-muted">{currencyFormat(p.revenue)}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* ── Cupones ───────────────────────────────────────────────────────── */}
      {d.couponOrderCount > 0 && (
        <div className="kyzz-panel p-6 mb-6">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted">Cupones de descuento</h2>
            <span className="text-[11px] text-kyzz-muted">
              {d.couponOrderCount} órdenes · {currencyFormat(d.couponDiscountAgg._sum.couponDiscount ?? 0)} descontados
            </span>
          </div>
          <div className="space-y-2">
            {d.topCoupons.map((c) => (
              <div key={String(c.couponCode)} className="flex items-center justify-between py-2 border-b border-kyzz-secondary/50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-kyzz-dark bg-kyzz-tertiary px-2 py-0.5 border border-kyzz-secondary">
                    {c.couponCode}
                  </span>
                  <span className="text-[11px] text-kyzz-muted">{c._count.id} uso{c._count.id !== 1 ? 's' : ''}</span>
                </div>
                <span className="text-[11px] text-kyzz-primary font-medium">
                  −{currencyFormat(c._sum.couponDiscount ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
