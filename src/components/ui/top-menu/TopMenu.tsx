"use client";
import { useEffect, useState } from 'react';

import Link from "next/link";
import { IoSearchOutline, IoCartOutline, IoPersonOutline } from "react-icons/io5";

import { titleFont } from "@/config/fonts";
import { useCartStore, useUIStore } from "@/store";

export const TopMenu = () => {

  const openSideMenu = useUIStore((state) => state.openSideMenu);
  const totalItemsInCart = useCartStore((state) => state.getTotalItems());

  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(true); }, []);

  return (
    <header className="sticky top-0 z-50 bg-kyzz-neutral/95 backdrop-blur-sm border-b border-kyzz-secondary">
      <nav className="max-w-7xl mx-auto px-6 h-16 grid grid-cols-3 items-center">

        {/* Col 1 — Navegación izquierda */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/gender/women"
            className="text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors duration-200"
          >
            Colecciones
          </Link>
          <Link
            href="/"
            className="text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors duration-200"
          >
            Nuestra esencia
          </Link>
          <Link
            href="/"
            className="text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors duration-200"
          >
            Contacto
          </Link>
        </div>

        {/* Col 1 mobile — Menú hamburguesa */}
        <div className="flex md:hidden">
          <button
            onClick={openSideMenu}
            className="text-kyzz-dark hover:text-kyzz-primary transition-colors"
            aria-label="Abrir menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Col 2 — Logo centrado */}
        <div className="flex justify-center">
          <Link href="/" className="group">
            <span className={`${titleFont.className} text-xl tracking-[0.25em] uppercase text-kyzz-dark group-hover:text-kyzz-primary transition-colors duration-200`}>
              KYZZ
            </span>
          </Link>
        </div>

        {/* Col 3 — Iconos derecha */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/search" className="text-kyzz-dark hover:text-kyzz-primary transition-colors" aria-label="Buscar">
            <IoSearchOutline className="w-5 h-5" />
          </Link>

          <Link
            href={(totalItemsInCart === 0 && loaded) ? '/empty' : '/cart'}
            className="text-kyzz-dark hover:text-kyzz-primary transition-colors relative"
            aria-label="Carrito"
          >
            {loaded && totalItemsInCart > 0 && (
              <span className="fade-in absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-kyzz-primary text-white text-[10px] flex items-center justify-center font-medium">
                {totalItemsInCart}
              </span>
            )}
            <IoCartOutline className="w-5 h-5" />
          </Link>

          <button
            onClick={openSideMenu}
            className="hidden md:flex text-kyzz-dark hover:text-kyzz-primary transition-colors"
            aria-label="Perfil"
          >
            <IoPersonOutline className="w-5 h-5" />
          </button>
        </div>

      </nav>
    </header>
  );
};

