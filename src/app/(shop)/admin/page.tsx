import { auth } from '@/auth';
import { titleFont } from '@/config/fonts';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export const revalidate = 0;

async function getStats() {
  const [products, orders, users, pendingOrders] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.order.count({ where: { isPaid: false } }),
  ]);
  return { products, orders, users, pendingOrders };
}

const cards = [
  { label: 'Productos', href: '/admin/products', icon: '◈' },
  { label: 'Órdenes',   href: '/admin/orders',   icon: '◎' },
  { label: 'Usuarios',  href: '/admin/users',     icon: '✦' },
  { label: 'Nuevo producto', href: '/admin/product/new', icon: '+' },
];

export default async function AdminPage() {
  const [session, stats] = await Promise.all([auth(), getStats()]);

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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
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
