"use client";

import Link from "next/link";
import clsx from "clsx";
import { useSession } from "next-auth/react";
import {
  IoCloseOutline,
  IoLogInOutline,
  IoLogOutOutline,
  IoPeopleOutline,
  IoPersonOutline,
  IoShirtOutline,
  IoTicketOutline,
  IoStarOutline,
  IoReturnUpBackOutline,
} from "react-icons/io5";

import { signOut } from "next-auth/react";
import { titleFont } from "@/config/fonts";
import { useUIStore } from "@/store";

const CATEGORIES = [
  { label: "Jeans",      href: "/products?category=jeans" },
  { label: "Blusas",     href: "/products?category=blusas" },
  { label: "Enterizos",  href: "/products?category=enterizos" },
  { label: "Chaquetas",  href: "/products?category=chaquetas" },
];

export const Sidebar = ({ showFeatured = false }: { showFeatured?: boolean }) => {
  const isMobileMenuOpen = useUIStore((state) => state.isMobileMenuOpen);
  const closeMobileMenu  = useUIStore((state) => state.closeMobileMenu);

  const { data: session } = useSession();
  const isAuthenticated   = !!session?.user;
  const isAdmin           = session?.user?.role === "admin";

  return (
    <div>
      {/* Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-kyzz-dark/40 backdrop-blur-sm fade-in"
          onClick={closeMobileMenu}
        />
      )}

      <nav
        className={clsx(
          "fixed top-0 left-0 w-[300px] h-screen bg-kyzz-neutral z-40 shadow-2xl",
          "flex flex-col transform transition-transform duration-300 ease-in-out",
          {
            "-translate-x-full": !isMobileMenuOpen,
            "translate-x-0":    isMobileMenuOpen,
          }
        )}
        aria-label="Menú móvil"
      >
        {/* ── Cabecera ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-kyzz-secondary">
          <Link
            href="/"
            onClick={closeMobileMenu}
            className={`${titleFont.className} text-sm tracking-[0.25em] uppercase text-kyzz-dark`}
          >
            KYZZ
          </Link>
          <button
            onClick={closeMobileMenu}
            className="text-kyzz-muted hover:text-kyzz-dark transition-colors"
            aria-label="Cerrar menú"
          >
            <IoCloseOutline size={22} />
          </button>
        </div>

        {/* ── Contenido scrollable ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Sección: Tienda ──────────────────────────── */}
          <div className="px-6 py-6">
            <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-4">
              Tienda
            </p>

            <MobileLink
              href="/products"
              label="Todas las piezas"
              icon={<IoShirtOutline size={16} />}
              onClick={closeMobileMenu}
            />

            {showFeatured && (
              <MobileLink
                href="/coleccion-especial"
                label="Colección Especial"
                icon={<IoStarOutline size={16} />}
                onClick={closeMobileMenu}
                highlight
              />
            )}

            {/* Categorías */}
            <div className="mt-4">
              <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">
                Categorías
              </p>
              {CATEGORIES.map((cat) => (
                <MobileLink
                  key={cat.href}
                  href={cat.href}
                  label={cat.label}
                  onClick={closeMobileMenu}
                  indent
                />
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-kyzz-secondary">
              <MobileLink
                href="/contacto"
                label="Contacto"
                onClick={closeMobileMenu}
              />
            </div>
          </div>

          {/* ── Sección: Cuenta ──────────────────────────── */}
          <div className="px-6 pb-6 border-t border-kyzz-secondary pt-6">
            <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-4">
              Mi cuenta
            </p>

            {isAuthenticated ? (
              <>
                {session.user?.name && (
                  <p className="text-xs text-kyzz-dark mb-4 font-medium truncate">
                    {session.user.name}
                  </p>
                )}

                <MobileLink href="/profile"      label="Mi perfil"        icon={<IoPersonOutline size={16} />}         onClick={closeMobileMenu} />
                <MobileLink href="/orders"       label="Mis pedidos"      icon={<IoTicketOutline size={16} />}         onClick={closeMobileMenu} />
                <MobileLink href="/devoluciones" label="Mis devoluciones" icon={<IoReturnUpBackOutline size={16} />}   onClick={closeMobileMenu} />

                {isAdmin && (
                  <>
                    <div className="my-3 border-t border-kyzz-secondary" />
                    <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-3">Admin</p>
                    <MobileLink href="/admin"          label="Dashboard" icon={<IoPeopleOutline size={16} />} onClick={closeMobileMenu} />
                    <MobileLink href="/admin/products" label="Productos" icon={<IoShirtOutline size={16} />}  onClick={closeMobileMenu} />
                    <MobileLink href="/admin/orders"   label="Órdenes"   icon={<IoTicketOutline size={16} />} onClick={closeMobileMenu} />
                    <MobileLink href="/admin/users"    label="Usuarios"  icon={<IoPeopleOutline size={16} />} onClick={closeMobileMenu} />
                  </>
                )}

                <div className="mt-4 pt-4 border-t border-kyzz-secondary">
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex items-center gap-3 w-full py-2.5 text-sm text-kyzz-muted hover:text-red-500 transition-colors"
                  >
                    <IoLogOutOutline size={16} />
                    <span className="text-[11px] tracking-widest uppercase">Cerrar sesión</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <MobileLink href="/auth/login"       label="Ingresar"      icon={<IoLogInOutline size={16} />}  onClick={closeMobileMenu} />
                <MobileLink href="/auth/new-account" label="Crear cuenta"  icon={<IoPersonOutline size={16} />} onClick={closeMobileMenu} />
              </>
            )}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-kyzz-secondary">
          <p className="text-[10px] text-kyzz-muted tracking-wider">
            Basics for every you ♡
          </p>
        </div>
      </nav>
    </div>
  );
};

// ── Helpers ────────────────────────────────────────────────────

interface MobileLinkProps {
  href: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  indent?: boolean;
  highlight?: boolean;
}

const MobileLink = ({ href, label, icon, onClick, indent, highlight }: MobileLinkProps) => (
  <Link
    href={href}
    onClick={onClick}
    className={clsx(
      "flex items-center gap-3 py-2.5 text-sm transition-colors",
      indent && "pl-2",
      highlight
        ? "text-kyzz-primary hover:text-kyzz-dark"
        : "text-kyzz-muted hover:text-kyzz-dark"
    )}
  >
    {icon && <span className="shrink-0">{icon}</span>}
    <span className="text-[12px] tracking-wide">{label}</span>
  </Link>
);
