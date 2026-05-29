import { auth } from '@/auth';
import { titleFont } from '@/config/fonts';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { currencyFormat } from '@/utils';
import { LOW_STOCK_THRESHOLD, REORDER_POINT } from '@/config/constants';
import {
  IoStorefrontOutline, IoReceiptOutline, IoPeopleOutline,
  IoAddCircleOutline, IoMailOutline, IoSettingsOutline,
} from 'react-icons/io5';

export const revalidate = 0;

const TREND_DAYS = 14;

// Clave de fecha YYYY-MM-DD en horario Colombia (evita corrimiento de día por UTC)
const cotDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' });

async function getStats() {
  const [products, orders, users, pendingOrders] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.order.count({ where: { isPaid: false, cancelledAt: null } }),
  ]);
  return { products, orders, users, pendingOrders };
}

async function getRevenueStats() {
  const now = new Date();
  const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [total, thisMonth, lastMonth, paidCount] = await Promise.all([
    prisma.order.aggregate({ where: { isPaid: true }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { isPaid: true, paidAt: { gte: startOfMonth } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { isPaid: true, paidAt: { gte: startOfLastMonth, lt: startOfMonth } }, _sum: { total: true } }),
    prisma.order.count({ where: { isPaid: true } }),
  ]);

  const totalValue     = total._sum.total ?? 0;
  const thisMonthValue = thisMonth._sum.total ?? 0;
  const lastMonthValue = lastMonth._sum.total ?? 0;
  const trend = lastMonthValue === 0
    ? null
    : ((thisMonthValue - lastMonthValue) / lastMonthValue) * 100;

  return {
    total:     totalValue,
    thisMonth: thisMonthValue,
    lastMonth: lastMonthValue,
    trend,
    aov:       paidCount > 0 ? totalValue / paidCount : 0,
    paidCount,
  };
}

// Productos en o por debajo del punto de reorden (incluye agotados y críticos)
async function getReorderProducts() {
  return prisma.product.findMany({
    where: { inStock: { lte: REORDER_POINT } },
    select: { id: true, title: true, slug: true, inStock: true },
    orderBy: { inStock: 'asc' },
    take: 12,
  });
}

// Top productos por unidades vendidas (solo órdenes pagadas)
async function getBestSellers() {
  const grouped = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { order: { isPaid: true } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  });
  if (grouped.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) } },
    select: { id: true, title: true, slug: true },
  });

  return grouped
    .map((g) => {
      const product = products.find((p) => p.id === g.productId);
      if (!product) return null;
      return { ...product, units: g._sum.quantity ?? 0 };
    })
    .filter((x): x is { id: string; title: string; slug: string; units: number } => x !== null);
}

// Ingresos por día (últimos TREND_DAYS días, horario COT)
async function getDailyTrend() {
  const since = new Date();
  since.setDate(since.getDate() - TREND_DAYS);

  const orders = await prisma.order.findMany({
    where:  { isPaid: true, paidAt: { gte: since } },
    select: { paidAt: true, total: true },
  });

  const buckets = new Map<string, number>();
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets.set(cotDate.format(d), 0);
  }
  for (const o of orders) {
    if (!o.paidAt) continue;
    const key = cotDate.format(o.paidAt);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + o.total);
  }

  return Array.from(buckets.entries()).map(([day, revenue]) => ({ day, revenue }));
}

// Pedidos sin pagar (no cancelados) — inventario reservado que aún no se ha cobrado
async function getUnpaidOrders() {
  return prisma.order.findMany({
    where:  { isPaid: false, cancelledAt: null },
    select: {
      id: true, total: true, createdAt: true, guestEmail: true,
      user: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });
}

// Ventas por canal (omnicanalidad) + salud de la operación contraentrega
async function getChannelStats() {
  const [byChannel, codTotal, codConfirmed, codDelivered, codCancelled] = await Promise.all([
    prisma.order.groupBy({
      by:     ['channel'],
      where:  { isPaid: true },
      _sum:   { total: true },
      _count: true,
    }),
    prisma.order.count({ where: { paymentMethod: 'cod' } }),
    prisma.order.count({ where: { paymentMethod: 'cod', codConfirmedAt: { not: null } } }),
    prisma.order.count({ where: { paymentMethod: 'cod', shippingStatus: 'delivered' } }),
    prisma.order.count({ where: { paymentMethod: 'cod', cancelledAt: { not: null } } }),
  ]);
  return { byChannel, codTotal, codConfirmed, codDelivered, codCancelled };
}

const CHANNEL_LABEL: Record<string, string> = {
  web: 'Web', whatsapp: 'WhatsApp', instagram: 'Instagram', other: 'Otro',
};

const QUICK_LINKS = [
  { label: 'Productos',      desc: 'Ver y editar catálogo',      href: '/admin/products',     Icon: IoStorefrontOutline },
  { label: 'Pedidos',        desc: 'Gestionar órdenes',          href: '/admin/orders',        Icon: IoReceiptOutline },
  { label: 'Usuarios',       desc: 'Roles y cuentas',            href: '/admin/users',         Icon: IoPeopleOutline },
  { label: 'Newsletter',     desc: 'Enviar campaña de email',    href: '/admin/newsletter',    Icon: IoMailOutline },
  { label: 'Nuevo producto', desc: 'Agregar al catálogo',        href: '/admin/product/new',   Icon: IoAddCircleOutline },
  { label: 'Configuración',  desc: 'Banner y ajustes del sitio', href: '/admin/configuracion', Icon: IoSettingsOutline },
];

// Antigüedad legible de un pedido impago
function orderAge(createdAt: Date): string {
  const hours = Math.floor((Date.now() - createdAt.getTime()) / 3_600_000);
  if (hours < 1)  return 'hace minutos';
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export default async function AdminPage() {
  const [session, stats, revenue, reorderProducts, bestSellers, trend, unpaidOrders, channelStats] = await Promise.all([
    auth(),
    getStats(),
    getRevenueStats(),
    getReorderProducts(),
    getBestSellers(),
    getDailyTrend(),
    getUnpaidOrders(),
    getChannelStats(),
  ]);

  const channelRevenueTotal = channelStats.byChannel.reduce((s, c) => s + (c._sum.total ?? 0), 0);
  const codRejectionRate = channelStats.codTotal > 0
    ? (channelStats.codCancelled / channelStats.codTotal) * 100
    : 0;

  const maxTrend     = Math.max(...trend.map((t) => t.revenue), 1);
  const maxUnits     = Math.max(...bestSellers.map((b) => b.units), 1);
  const trendTotal   = trend.reduce((sum, t) => sum + t.revenue, 0);

  // Niveles de reabastecimiento (punto de reorden)
  const outOfStock  = reorderProducts.filter((p) => p.inStock === 0);
  const critical    = reorderProducts.filter((p) => p.inStock > 0 && p.inStock < LOW_STOCK_THRESHOLD);
  const reorderSoon = reorderProducts.filter((p) => p.inStock >= LOW_STOCK_THRESHOLD && p.inStock <= REORDER_POINT);

  return (
    <main className="max-w-5xl mx-auto px-6 py-16">

      {/* Cabecera */}
      <div className="mb-10">
        <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-3">
          Panel de gestión
        </p>
        <h1 className={`${titleFont.className} text-4xl font-normal text-kyzz-dark`}>
          Bienvenida, {session?.user?.name?.split(' ')[0]}
        </h1>
        <div className="w-8 h-px bg-kyzz-secondary mt-4" />
      </div>

      {/* Revenue + AOV */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="kyzz-panel p-6">
          <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted mb-1">Ingresos totales</p>
          <p className={`${titleFont.className} text-3xl text-kyzz-dark`}>{currencyFormat(revenue.total)}</p>
        </div>
        <div className="kyzz-panel p-6">
          <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted mb-1">Este mes</p>
          <p className={`${titleFont.className} text-3xl text-kyzz-dark`}>{currencyFormat(revenue.thisMonth)}</p>
          {revenue.trend !== null && (
            <p className={`text-[11px] tracking-wide mt-1 ${revenue.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {revenue.trend >= 0 ? '↑' : '↓'} {Math.abs(revenue.trend).toFixed(1)}% vs mes anterior
            </p>
          )}
        </div>
        <div className="kyzz-panel p-6">
          <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted mb-1">Mes anterior</p>
          <p className={`${titleFont.className} text-3xl text-kyzz-dark`}>{currencyFormat(revenue.lastMonth)}</p>
        </div>
        <div className="kyzz-panel p-6">
          <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted mb-1">Ticket promedio</p>
          <p className={`${titleFont.className} text-3xl text-kyzz-dark`}>{currencyFormat(revenue.aov)}</p>
          <p className="text-[11px] tracking-wide mt-1 text-kyzz-muted">
            {revenue.paidCount} {revenue.paidCount === 1 ? 'orden pagada' : 'órdenes pagadas'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Productos', value: stats.products },
          { label: 'Órdenes',   value: stats.orders },
          { label: 'Usuarios',  value: stats.users },
          { label: 'Sin pagar', value: stats.pendingOrders },
        ].map(({ label, value }) => (
          <div key={label} className="kyzz-panel p-6">
            <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted mb-1">{label}</p>
            <p className={`${titleFont.className} text-3xl text-kyzz-dark`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Ventas por canal + salud contraentrega */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="kyzz-panel p-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted mb-5">
            Ingresos por canal
          </h2>
          {channelRevenueTotal === 0 ? (
            <p className="text-sm text-kyzz-muted py-4">Sin ventas pagadas aún.</p>
          ) : (
            <div className="space-y-3">
              {channelStats.byChannel
                .slice()
                .sort((a, b) => (b._sum.total ?? 0) - (a._sum.total ?? 0))
                .map((c) => {
                  const value = c._sum.total ?? 0;
                  const pct   = (value / channelRevenueTotal) * 100;
                  return (
                    <div key={c.channel}>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-kyzz-dark">{CHANNEL_LABEL[c.channel] ?? c.channel}</span>
                        <span className="text-kyzz-muted">{currencyFormat(value)} · {c._count} ped.</span>
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

        <div className="kyzz-panel p-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted mb-5">
            Contraentrega
          </h2>
          {channelStats.codTotal === 0 ? (
            <p className="text-sm text-kyzz-muted py-4">Sin pedidos contraentrega aún.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total COD',    value: channelStats.codTotal },
                { label: 'Confirmados',  value: channelStats.codConfirmed },
                { label: 'Entregados',   value: channelStats.codDelivered },
                { label: 'Cancelados',   value: channelStats.codCancelled },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[11px] tracking-wide uppercase text-kyzz-muted">{label}</p>
                  <p className={`${titleFont.className} text-2xl text-kyzz-dark`}>{value}</p>
                </div>
              ))}
              <div className="col-span-2 pt-2 border-t border-kyzz-secondary">
                <p className="text-[11px] tracking-wide text-kyzz-muted">
                  Tasa de cancelación COD:{' '}
                  <span className={codRejectionRate > 20 ? 'text-red-500' : 'text-kyzz-dark'}>
                    {codRejectionRate.toFixed(1)}%
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tendencia de ventas (14 días) */}
      <div className="kyzz-panel p-6 mb-8">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted">
            Ventas · últimos {TREND_DAYS} días
          </h2>
          <p className="text-[11px] tracking-wide text-kyzz-muted">
            {currencyFormat(trendTotal)} en total
          </p>
        </div>
        {trendTotal === 0 ? (
          <p className="text-sm text-kyzz-muted py-8 text-center">Sin ventas en el período.</p>
        ) : (
          <div className="flex items-end justify-between gap-1 h-32">
            {trend.map((t) => (
              <div key={t.day} className="flex-1 flex flex-col items-center justify-end h-full group">
                <div className="relative w-full flex justify-center">
                  <div
                    className="w-full max-w-[18px] bg-kyzz-secondary group-hover:bg-kyzz-primary transition-colors rounded-t-sm"
                    style={{ height: `${Math.max((t.revenue / maxTrend) * 112, t.revenue > 0 ? 4 : 0)}px` }}
                    title={`${t.day}: ${currencyFormat(t.revenue)}`}
                  />
                </div>
                <span className="text-[9px] text-kyzz-muted mt-1.5">{t.day.slice(8)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Más vendidos + Pedidos sin pagar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">

        {/* Más vendidos */}
        <div className="kyzz-panel p-6">
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted mb-5">Más vendidos</h2>
          {bestSellers.length === 0 ? (
            <p className="text-sm text-kyzz-muted py-4">Aún no hay ventas registradas.</p>
          ) : (
            <ol className="flex flex-col gap-4">
              {bestSellers.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span className={`${titleFont.className} text-lg text-kyzz-secondary w-5 shrink-0`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/product/${p.slug}`}
                      className="text-sm text-kyzz-dark hover:text-kyzz-primary transition-colors truncate block"
                    >
                      {p.title}
                    </Link>
                    <div className="mt-1.5 h-1 bg-kyzz-tertiary rounded-full overflow-hidden">
                      <div className="h-full bg-kyzz-primary" style={{ width: `${(p.units / maxUnits) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-[11px] tracking-wide text-kyzz-muted shrink-0">{p.units} uds.</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Pedidos sin pagar */}
        <div className="kyzz-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted">Pedidos sin pagar</h2>
            <Link href="/admin/orders" className="text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors">
              Ver todos →
            </Link>
          </div>
          {unpaidOrders.length === 0 ? (
            <p className="text-sm text-kyzz-muted py-4">No hay pedidos pendientes de pago.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-kyzz-secondary/40">
              {unpaidOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5">
                  <Link href={`/admin/orders/${o.id}`} className="min-w-0 mr-3 group">
                    <span className="text-sm text-kyzz-dark group-hover:text-kyzz-primary transition-colors truncate block">
                      {o.user?.name ?? o.user?.email ?? o.guestEmail ?? 'Invitada'}
                    </span>
                    <span className="text-[11px] text-kyzz-muted">{orderAge(o.createdAt)}</span>
                  </Link>
                  <span className="text-sm text-kyzz-dark shrink-0">{currencyFormat(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Reabastecimiento (punto de reorden) */}
      {reorderProducts.length > 0 && (
        <div className="mb-12 kyzz-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted">
              Reabastecimiento
            </h2>
            <Link
              href="/admin/products"
              className="text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
            >
              Ver productos →
            </Link>
          </div>

          <div className="space-y-5">
            {[
              { label: 'Agotado',          items: outOfStock,  dot: 'bg-red-500',   text: 'text-red-600' },
              { label: 'Stock crítico',    items: critical,    dot: 'bg-amber-500', text: 'text-amber-600' },
              { label: 'Reordenar pronto', items: reorderSoon, dot: 'bg-sky-500',   text: 'text-sky-600' },
            ].filter((tier) => tier.items.length > 0).map((tier) => (
              <div key={tier.label}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
                  <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted">
                    {tier.label} · {tier.items.length}
                  </p>
                </div>
                <div className="flex flex-col divide-y divide-kyzz-secondary/40">
                  {tier.items.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2">
                      <Link
                        href={`/admin/product/${p.slug}`}
                        className="text-sm text-kyzz-dark hover:text-kyzz-primary transition-colors truncate mr-4"
                      >
                        {p.title}
                      </Link>
                      <span className={`shrink-0 text-[11px] font-medium tracking-wide ${tier.text}`}>
                        {p.inStock === 0 ? 'Sin stock' : `${p.inStock} uds.`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Accesos rápidos */}
      <h2 className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-6">
        Accesos rápidos
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {QUICK_LINKS.map(({ label, desc, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="kyzz-panel p-6 flex items-start gap-4 hover:border-kyzz-primary transition-colors group"
          >
            <span className="shrink-0 w-10 h-10 flex items-center justify-center border border-kyzz-secondary group-hover:border-kyzz-primary transition-colors">
              <Icon size={18} className="text-kyzz-muted group-hover:text-kyzz-primary transition-colors" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-kyzz-dark group-hover:text-kyzz-primary transition-colors leading-tight">
                {label}
              </p>
              <p className="text-[11px] text-kyzz-muted mt-0.5 leading-tight">{desc}</p>
            </div>
            <span className="ml-auto text-kyzz-muted text-xs shrink-0 mt-0.5 group-hover:text-kyzz-primary transition-colors">→</span>
          </Link>
        ))}
      </div>

    </main>
  );
}
