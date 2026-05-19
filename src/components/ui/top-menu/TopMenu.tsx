"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IoCartOutline, IoHeartOutline, IoSearchOutline } from "react-icons/io5";

import { titleFont } from "@/config/fonts";
import { useCartStore, useUIStore, useWishlistStore } from "@/store";
import { UserMenu } from "./UserMenu";
import { SearchOverlay } from "./SearchOverlay";

interface NavCategory { name: string; slug: string; }

interface Props { categories?: NavCategory[]; }

export const TopMenu = ({ categories = [] }: Props) => {
  const openMobileMenu = useUIStore((state) => state.openMobileMenu);
  const openSearch     = useUIStore((state) => state.openSearch);
  const totalItems      = useCartStore((state) => state.getTotalItems());
  const wishlistCount   = useWishlistStore((state) => state.items.length);

  const [mounted, setMounted]   = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const catsRef                  = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catsRef.current && !catsRef.current.contains(e.target as Node)) {
        setCatsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 bg-kyzz-neutral/95 backdrop-blur-sm border-b border-kyzz-secondary">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* ── IZQUIERDA ────────────────────────────────────── */}
          <div className="flex items-center gap-6">

            {/* Hamburguesa — solo mobile */}
            <button
              onClick={openMobileMenu}
              className="md:hidden text-kyzz-dark hover:text-kyzz-primary transition-colors"
              aria-label="Abrir menú"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Links de navegación — solo desktop */}
            <div className="hidden md:flex items-center gap-6">

              {/* Dropdown Colecciones */}
              <div className="relative" ref={catsRef}>
                <button
                  onClick={() => setCatsOpen((v) => !v)}
                  className="nav-link flex items-center gap-1"
                  aria-expanded={catsOpen}
                >
                  Colecciones
                  <ChevronIcon open={catsOpen} />
                </button>

                {catsOpen && (
                  <div className="absolute top-full left-0 mt-2 w-52 bg-kyzz-neutral border border-kyzz-secondary shadow-xl z-50 fade-in">
                    {/* Ver todo */}
                    <Link
                      href="/products"
                      onClick={() => setCatsOpen(false)}
                      className="block px-5 py-3 text-[11px] tracking-widest uppercase text-kyzz-dark hover:bg-kyzz-tertiary transition-colors border-b border-kyzz-secondary"
                    >
                      Ver todo
                    </Link>
                    {/* Categorías */}
                    {categories.map((cat: NavCategory) => (
                      <Link
                        key={cat.slug}
                        href={`/products?category=${cat.slug}`}
                        onClick={() => setCatsOpen(false)}
                        className="block px-5 py-3 text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-dark hover:bg-kyzz-tertiary transition-colors"
                      >
                        {cat.name}
                      </Link>
                    ))}
                    {/* Separador + colección especial */}
                    <div className="border-t border-kyzz-secondary">
                      <Link
                        href="/coleccion-especial"
                        onClick={() => setCatsOpen(false)}
                        className="block px-5 py-3 text-[11px] tracking-widest uppercase text-kyzz-primary hover:bg-kyzz-tertiary transition-colors"
                      >
                        ✦ Colección Especial
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <Link href="/contacto" className="nav-link">
                Contacto
              </Link>
            </div>
          </div>

          {/* ── CENTRO — Logo ────────────────────────────────── */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2"
            aria-label="Kyzz — Inicio"
          >
            <span
              className={`${titleFont.className} text-xl tracking-[0.25em] uppercase text-kyzz-dark hover:text-kyzz-primary transition-colors duration-200`}
            >
              KYZZ
            </span>
          </Link>

          {/* ── DERECHA — Acciones ───────────────────────────── */}
          <div className="flex items-center gap-4">

            <button
              onClick={openSearch}
              className="text-kyzz-dark hover:text-kyzz-primary transition-colors"
              aria-label="Buscar"
            >
              <IoSearchOutline className="w-5 h-5" />
            </button>

            <Link
              href="/wishlist"
              className="relative text-kyzz-dark hover:text-kyzz-primary transition-colors"
              aria-label="Favoritos"
            >
              {mounted && wishlistCount > 0 && (
                <span className="fade-in absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-kyzz-primary text-white text-[10px] flex items-center justify-center font-medium">
                  {wishlistCount}
                </span>
              )}
              <IoHeartOutline className="w-5 h-5" />
            </Link>

            <Link
              href={mounted && totalItems > 0 ? "/cart" : "/empty"}
              className="relative text-kyzz-dark hover:text-kyzz-primary transition-colors"
              aria-label="Carrito"
            >
              {mounted && totalItems > 0 && (
                <span className="fade-in absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-kyzz-primary text-white text-[10px] flex items-center justify-center font-medium">
                  {totalItems}
                </span>
              )}
              <IoCartOutline className="w-5 h-5" />
            </Link>

            <div className="hidden md:block">
              <UserMenu />
            </div>
          </div>
        </nav>
      </header>

      <SearchOverlay />
    </>
  );
};

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
