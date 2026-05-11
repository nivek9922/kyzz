"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { IoPersonOutline } from "react-icons/io5";

export const UserMenu = () => {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar en click exterior
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Loading
  if (status === "loading") {
    return <div className="w-5 h-5 rounded-full bg-kyzz-secondary animate-pulse" />;
  }

  // No autenticado
  if (!session?.user) {
    return (
      <Link
        href="/auth/login"
        className="text-kyzz-dark hover:text-kyzz-primary transition-colors"
        aria-label="Ingresar"
      >
        <IoPersonOutline className="w-5 h-5" />
      </Link>
    );
  }

  const isAdmin = session.user.role === "admin";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-kyzz-dark hover:text-kyzz-primary transition-colors"
        aria-label="Mi cuenta"
        aria-expanded={open}
      >
        <IoPersonOutline className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-3 w-52 bg-kyzz-neutral border border-kyzz-secondary shadow-xl z-50 fade-in">

          {/* Usuario */}
          <div className="px-5 py-4 border-b border-kyzz-secondary">
            <p className="text-xs text-kyzz-dark font-medium truncate">{session.user.name}</p>
            <p className="text-[10px] text-kyzz-muted truncate mt-0.5">{session.user.email}</p>
          </div>

          {/* Links cuenta */}
          <div className="py-1">
            <DropdownLink href="/profile"  label="Mi perfil"   onClick={() => setOpen(false)} />
            <DropdownLink href="/orders"   label="Mis pedidos" onClick={() => setOpen(false)} />
          </div>

          {/* Admin */}
          {isAdmin && (
            <>
              <div className="border-t border-kyzz-secondary" />
              <div className="py-1">
                <DropdownLink href="/admin"          label="Panel admin"  onClick={() => setOpen(false)} />
                <DropdownLink href="/admin/products" label="Productos"    onClick={() => setOpen(false)} />
                <DropdownLink href="/admin/orders"   label="Órdenes"      onClick={() => setOpen(false)} />
              </div>
            </>
          )}

          {/* Cerrar sesión */}
          <div className="border-t border-kyzz-secondary">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full text-left px-5 py-3 text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-red-500 hover:bg-kyzz-tertiary transition-colors"
            >
              Cerrar sesión
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

interface DropdownLinkProps {
  href: string;
  label: string;
  onClick: () => void;
}

const DropdownLink = ({ href, label, onClick }: DropdownLinkProps) => (
  <Link
    href={href}
    onClick={onClick}
    className="block px-5 py-2.5 text-xs tracking-wide text-kyzz-muted hover:text-kyzz-dark hover:bg-kyzz-tertiary transition-colors"
  >
    {label}
  </Link>
);
