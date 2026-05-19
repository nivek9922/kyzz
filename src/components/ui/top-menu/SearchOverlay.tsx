"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  IoCloseOutline,
  IoSearchOutline,
  IoChevronForward,
  IoChevronBack,
} from "react-icons/io5";
import Image from "next/image";
import { useUIStore } from "@/store";
import { searchProductsQuick, type QuickSearchResult } from "@/actions/product/search-products-quick";
import { getTrendingProducts } from "@/actions/product/get-trending-products";
import { currencyFormat } from "@/utils";

const PLACEHOLDER = '/imgs/placeholder.jpg';

const imgSrc = (url: string) =>
  !url ? PLACEHOLDER : url.startsWith('http') || url.startsWith('/') ? url : `/products/${url}`;

// Miniatura con fallback si la imagen falla
function ProductThumb({ url, title }: { url: string; title: string }) {
  const [src, setSrc] = useState(() => imgSrc(url));
  return (
    <Image
      src={src}
      alt={title}
      fill
      sizes="160px"
      className="object-cover transition-transform duration-300 group-hover:scale-105"
      onError={() => setSrc(PLACEHOLDER)}
    />
  );
}

// Tarjeta de producto — ancho fijo, no se encoge (una sola fila)
function ProductCard({
  product,
  selected,
  onClick,
}: {
  product: QuickSearchResult;
  selected: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selected) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [selected]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`group shrink-0 w-36 text-left transition-opacity duration-150 ${
        selected ? 'opacity-70' : 'hover:opacity-80'
      }`}
    >
      <div className={`relative aspect-[3/4] overflow-hidden bg-kyzz-secondary/20 ${
        selected ? 'ring-1 ring-kyzz-primary' : ''
      }`}>
        <ProductThumb url={product.image} title={product.title} />
        {product.isFeatured && (
          <span className="absolute top-1.5 left-1.5 text-[8px] tracking-widest uppercase bg-kyzz-dark text-white px-1.5 py-0.5">
            Top
          </span>
        )}
      </div>
      <div className="mt-2">
        <p className="text-xs text-kyzz-dark truncate leading-snug">{product.title}</p>
        <p className="text-[11px] text-kyzz-muted mt-0.5">{currencyFormat(product.price)}</p>
      </div>
    </button>
  );
}

// Contenedor horizontal de una sola fila + flechas de scroll
function HorizontalScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    return () => { obs.disconnect(); el.removeEventListener('scroll', update); };
  }, [update]);

  const scrollBy = (dir: 1 | -1) =>
    ref.current?.scrollBy({ left: dir * 460, behavior: 'smooth' });

  return (
    <div className="relative">
      <div ref={ref} className="flex gap-4 overflow-x-auto scrollbar-none pb-1">
        {children}
      </div>

      {/* Flecha izquierda */}
      {canLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Anterior"
          className="absolute left-0 top-[34%] -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-kyzz-neutral border border-kyzz-secondary shadow-md flex items-center justify-center text-kyzz-dark hover:bg-kyzz-tertiary transition-colors"
        >
          <IoChevronBack className="w-4 h-4" />
        </button>
      )}

      {/* Flecha derecha */}
      {canRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Siguiente"
          className="absolute right-0 top-[34%] -translate-y-1/2 translate-x-1/2 w-9 h-9 rounded-full bg-kyzz-neutral border border-kyzz-secondary shadow-md flex items-center justify-center text-kyzz-dark hover:bg-kyzz-tertiary transition-colors"
        >
          <IoChevronForward className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Skeleton de carga — una sola fila
function CardsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-x-hidden pb-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="shrink-0 w-36 animate-pulse">
          <div className="aspect-[3/4] bg-kyzz-secondary/40" />
          <div className="mt-2 space-y-1.5">
            <div className="h-2.5 bg-kyzz-secondary/40 w-4/5" />
            <div className="h-2 bg-kyzz-secondary/30 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export const SearchOverlay = () => {
  const isSearchOpen = useUIStore((s) => s.isSearchOpen);
  const closeSearch  = useUIStore((s) => s.closeSearch);
  const router       = useRouter();

  const [value,       setValue]       = useState("");
  const [results,     setResults]     = useState<QuickSearchResult[]>([]);
  const [trending,    setTrending]    = useState<QuickSearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [isPending,       startTransition]         = useTransition();
  const [trendingPending, startTrendingTransition] = useTransition();

  const inputRef       = useRef<HTMLInputElement>(null);
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trendingLoaded = useRef(false);

  // Reset + foco al abrir
  useEffect(() => {
    if (!isSearchOpen) return;
    setValue("");
    setResults([]);
    setSelectedIdx(-1);
    const t = setTimeout(() => inputRef.current?.focus(), 60);

    if (!trendingLoaded.current) {
      trendingLoaded.current = true;
      startTrendingTransition(async () => {
        const data = await getTrendingProducts(10);
        setTrending(data);
      });
    }

    return () => clearTimeout(t);
  }, [isSearchOpen]);

  // Búsqueda con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setSelectedIdx(-1);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const data = await searchProductsQuick(value.trim());
        setResults(data);
        setSelectedIdx(-1);
      });
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  const showResults = value.trim().length >= 2;

  // Teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isSearchOpen) return;
      if (e.key === "Escape") { closeSearch(); return; }
      if (!showResults || results.length === 0) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, -1));
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isSearchOpen, closeSearch, results, showResults]);

  const navigateTo = (path: string) => { router.push(path); closeSearch(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIdx >= 0 && results[selectedIdx]) {
      navigateTo(`/product/${results[selectedIdx].slug}`);
      return;
    }
    if (value.trim()) navigateTo(`/search?q=${encodeURIComponent(value.trim())}`);
  };

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-kyzz-dark/40 backdrop-blur-sm fade-in"
        onClick={closeSearch}
      />

      {/* Panel */}
      <div className="relative bg-kyzz-neutral border-b border-kyzz-secondary shadow-xl fade-in">
        <div className="px-4 md:px-8 lg:px-16 py-5 md:py-8">

          {/* ── Input ── */}
          <form onSubmit={handleSubmit} className="flex items-center gap-4">
            <IoSearchOutline className="w-5 h-5 text-kyzz-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Buscar en la colección..."
              className="flex-1 bg-transparent text-2xl text-kyzz-dark placeholder-kyzz-muted focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            {value && (
              <button
                type="button"
                onClick={() => { setValue(""); setResults([]); inputRef.current?.focus(); }}
                className="text-kyzz-muted hover:text-kyzz-dark transition-colors"
                aria-label="Limpiar"
              >
                <IoCloseOutline className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={closeSearch}
              className="text-kyzz-muted hover:text-kyzz-dark transition-colors pl-3 border-l border-kyzz-secondary"
              aria-label="Cerrar"
            >
              <IoCloseOutline className="w-6 h-6" />
            </button>
          </form>

          {/* ── Estado inicial: Tendencias ── */}
          {!showResults && (
            <div className="mt-6 pt-5 border-t border-kyzz-secondary">
              <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-4">
                Tendencias
              </p>

              {trendingPending
                ? <CardsSkeleton count={8} />
                : trending.length > 0
                  ? (
                    <HorizontalScroller>
                      {trending.map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          selected={false}
                          onClick={() => navigateTo(`/product/${p.slug}`)}
                        />
                      ))}
                    </HorizontalScroller>
                  )
                  : null
              }

              <p className="mt-5 text-[10px] text-kyzz-muted/50 tracking-wide">
                Enter para buscar · Esc para cerrar
              </p>
            </div>
          )}

          {/* ── Resultados: skeleton ── */}
          {showResults && isPending && (
            <div className="mt-6 pt-5 border-t border-kyzz-secondary">
              <CardsSkeleton count={8} />
            </div>
          )}

          {/* ── Resultados: cards ── */}
          {showResults && !isPending && results.length > 0 && (
            <div className="mt-6 pt-5 border-t border-kyzz-secondary">
              <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-4">
                {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
              </p>
              <HorizontalScroller>
                {results.map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    selected={idx === selectedIdx}
                    onClick={() => navigateTo(`/product/${product.slug}`)}
                  />
                ))}
              </HorizontalScroller>
              <button
                onClick={() => navigateTo(`/search?q=${encodeURIComponent(value.trim())}`)}
                className="mt-4 w-full text-[10px] tracking-[0.25em] uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors text-center"
              >
                Ver todos los resultados para &ldquo;{value}&rdquo; →
              </button>
            </div>
          )}

          {/* ── Empty state ── */}
          {showResults && !isPending && results.length === 0 && (
            <div className="mt-6 pt-5 border-t border-kyzz-secondary py-8 text-center">
              <p className="text-sm text-kyzz-muted">
                Sin resultados para{" "}
                <span className="text-kyzz-dark italic">&ldquo;{value}&rdquo;</span>
              </p>
              <p className="text-[10px] tracking-widest uppercase text-kyzz-muted/50 mt-2">
                Intenta con otro término
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
