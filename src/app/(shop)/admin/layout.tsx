import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { titleFont } from '@/config/fonts';
import {
  IoGridOutline,
  IoReceiptOutline,
  IoPeopleOutline,
  IoAddCircleOutline,
  IoStorefrontOutline,
  IoSettingsOutline,
  IoListOutline,
  IoMailOutline,
} from 'react-icons/io5';

const NAV = [
  { label: 'Dashboard',       href: '/admin',                  icon: IoGridOutline },
  { label: 'Productos',       href: '/admin/products',         icon: IoStorefrontOutline },
  { label: 'Pedidos',         href: '/admin/orders',           icon: IoReceiptOutline },
  { label: 'Usuarios',        href: '/admin/users',            icon: IoPeopleOutline },
  { label: 'Categorías',      href: '/admin/categorias',       icon: IoListOutline },
  { label: 'Newsletter',      href: '/admin/newsletter',       icon: IoMailOutline },
  { label: 'Nuevo producto',  href: '/admin/product/new',      icon: IoAddCircleOutline },
  { label: 'Configuración',   href: '/admin/configuracion',    icon: IoSettingsOutline },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (session?.user.role !== 'admin') {
    redirect('/auth/login');
  }

  return (
    <div className="flex min-h-screen bg-kyzz-neutral">

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-kyzz-secondary bg-kyzz-neutral">

        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-kyzz-secondary">
          <Link href="/admin" className={`${titleFont.className} text-sm tracking-[0.25em] uppercase text-kyzz-dark`}>
            KYZZ · Admin
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-0.5">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="admin-nav-link"
            >
              <Icon size={15} className="shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer sidebar */}
        <div className="px-6 py-4 border-t border-kyzz-secondary">
          <Link href="/" className="text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors">
            ← Volver a la tienda
          </Link>
        </div>
      </aside>

      {/* ── Contenido ────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">

        {/* Mobile header */}
        <div className="md:hidden h-14 flex items-center justify-between px-6 border-b border-kyzz-secondary bg-kyzz-neutral">
          <Link href="/admin" className={`${titleFont.className} text-sm tracking-[0.25em] uppercase text-kyzz-dark`}>
            KYZZ · Admin
          </Link>
          <Link href="/" className="text-[10px] tracking-widest uppercase text-kyzz-muted">← Tienda</Link>
        </div>

        {/* Mobile nav scroll */}
        <div className="md:hidden flex gap-1 px-4 py-3 overflow-x-auto border-b border-kyzz-secondary">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="admin-nav-pill"
            >
              <Icon size={12} />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          ))}
        </div>

        <div className="px-6 md:px-10 py-10">
          {children}
        </div>
      </main>

    </div>
  );
}
