import { auth } from '@/auth';
import { titleFont } from '@/config/fonts';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { currencyFormat } from '@/utils';

export const revalidate = 0;

const LOW_STOCK_THRESHOLD = 5;

async function getStats() {
  const [products, orders, users, pendingOrders, lowStock] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.order.count({ where: { isPaid: false } }),
    prisma.product.count({ where: { inStock: { lt: LOW_STOCK_THRESHOLD } } }),
  ]);
  return { products, orders, users, pendingOrders, lowStock };
}

async function getRevenueStats() {
  const now = new Date();
  const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [total, thisMonth, lastMonth] = await Promise.all([
    prisma.order.aggregate({
      where: { isPaid: true },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: { isPaid: true, paidAt: { gte: startOfMonth } },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: { isPaid: true, paidAt: { gte: startOfLastMonth, lt: startOfMonth } },
      _sum: { total: true },
    }),
  ]);

  const thisMonthValue = thisMonth._sum.total ?? 0;
  const lastMonthValue = lastMonth._sum.total ?? 0;
  const trend = lastMonthValue === 0
    ? null
    : ((thisMonthValue - lastMonthValue) / lastMonthValue) * 100;

  return {
    total:      total._sum.total ?? 0,
    thisMonth:  thisMonthValue,
    lastMonth:  lastMonthValue,
    trend,
  };
}

async function getLowStockProducts() {
  return prisma.product.findMany({
    where: { inStock: { lt: LOW_STOCK_THRESHOLD } },
    select: { id: true, title: true, slug: true, inStock: true },
    orderBy: { inStock: 'asc' },
    take: 8,
  });
}

const cards = [
  { label: 'Productos', href: '/admin/products', icon: '◈' },
  { label: 'Órdenes',   href: '/admin/orders',   icon: '◎' },
  { label: 'Usuarios',  href: '/admin/users',     icon: '✦' },
  { label: 'Nuevo producto', href: '/admin/product/new', icon: '+' },
];

export default async function AdminPage() {
  const [session, stats, revenue, lowStockProducts] = await Promise.all([
    auth(),
    getStats(),
    getRevenueStats(),
    getLowStockProducts(),
  ]);

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

      {/* Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="kyzz-panel p-6 sm:col-span-1">
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

      {/* Alerta stock bajo */}
      {lowStockProducts.length > 0 && (
        <div className="mb-12 border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 text-base">⚠</span>
              <p className="text-[11px] tracking-[0.2em] uppercase text-amber-700 font-medium">
                {stats.lowStock} {stats.lowStock === 1 ? 'producto' : 'productos'} con stock bajo
              </p>
            </div>
            <Link
              href="/admin/products"
              className="text-[10px] tracking-widest uppercase text-amber-600 hover:text-amber-800 transition-colors"
            >
              Ver todos →
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-amber-100">
            {lowStockProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5">
                <Link
                  href={`/admin/product/${p.slug}`}
                  className="text-sm text-kyzz-dark hover:text-kyzz-primary transition-colors truncate mr-4"
                >
                  {p.title}
                </Link>
                <span className={`shrink-0 text-[11px] font-medium tracking-wide ${p.inStock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                  {p.inStock === 0 ? 'Sin stock' : `${p.inStock} uds.`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Accesos rápidos */}
      <h2 className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-6">
        Accesos rápidos
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(({ label, href, icon }) => (
          <Link
            key={href}
            href={href}
            className="kyzz-panel p-6 flex items-center gap-4 hover:border-kyzz-primary transition-colors group"
          >
            <span className="text-kyzz-primary text-xl w-8">{icon}</span>
            <span className="text-sm tracking-wide text-kyzz-dark group-hover:text-kyzz-primary transition-colors">
              {label}
            </span>
            <span className="ml-auto text-kyzz-muted text-xs">→</span>
          </Link>
        ))}
      </div>

    </main>
  );
}
