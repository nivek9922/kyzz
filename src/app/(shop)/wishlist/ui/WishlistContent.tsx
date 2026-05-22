'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IoHeart, IoHeartOutline, IoHeartDislikeOutline } from 'react-icons/io5';
import { useWishlistStore } from '@/store';
import { getWishlistProducts } from '@/actions/product/get-wishlist-products';
import { GridLayoutSelector } from '@/components';
import { useGridLayout } from '@/hooks/useGridLayout';
import type { Columns } from '@/components/products/product-grid/ProductGrid';
import { currencyFormat } from '@/utils';
import { titleFont } from '@/config/fonts';

const colsMap: Record<Columns, string> = {
  0: 'grid-cols-1',
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
  6: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6',
};

type WishlistProduct = Awaited<ReturnType<typeof getWishlistProducts>>[number];

const imgSrc = (p: WishlistProduct) => {
  const url = p.ProductColors[0]?.images[0]?.url ?? p.ProductImage[0]?.url;
  if (!url) return '/imgs/placeholder.jpg';
  return url.startsWith('http') ? url : `/products/${url}`;
};

export const WishlistContent = () => {
  const { items, toggle } = useWishlistStore();

  const { isMobile, effectiveCols, mounted, isListView, handleChange } = useGridLayout({
    storageKeyMobile:  'kyzz-wishlist-cols-mobile',
    storageKeyDesktop: 'kyzz-wishlist-cols-desktop',
  });

  // ── Product cache: ID → data
  const [productMap, setProductMap] = useState<Map<string, WishlistProduct>>(new Map());
  const [initialLoading, setInitialLoading] = useState(true);
  const [, startTransition] = useTransition();
  const columnsReady = useRef(false);
  useEffect(() => { columnsReady.current = true; }, []);

  // ── Solo fetchea los IDs que no están en cache
  useEffect(() => {
    const missing = items.filter((id) => !productMap.has(id));

    if (missing.length === 0) {
      // Solo removes → no fetch, el memo derivado ya filtra
      setInitialLoading(false);
      return;
    }

    // Primera carga: muestra skeleton; carga adicional (add): silenciosa
    const isFirstLoad = productMap.size === 0 && items.length > 0;
    if (isFirstLoad) setInitialLoading(true);

    startTransition(() => {
      getWishlistProducts(missing).then((fetched) => {
        setProductMap((prev) => {
          const next = new Map(prev);
          fetched.forEach((p) => next.set(p.id, p));
          return next;
        });
        setInitialLoading(false);
      });
    });
  // productMap intencionalmente excluido: solo queremos reaccionar a cambios en items
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // ── Productos a mostrar: orden de la wishlist × cache
  const displayedProducts = useMemo(
    () => items.map((id) => productMap.get(id)).filter((p): p is WishlistProduct => !!p),
    [items, productMap]
  );

  // ── Skeleton de carga inicial
  if (initialLoading) {
    return (
      <div className="grid grid-cols-3 gap-x-4 gap-y-8 mt-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[3/4] bg-kyzz-secondary/40" />
            <div className="h-3 w-3/4 bg-kyzz-secondary/40 mt-3" />
            <div className="h-3 w-1/3 bg-kyzz-secondary/40 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  // ── Estado vacío
  if (displayedProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <IoHeartDislikeOutline size={48} className="text-kyzz-secondary" />
        <p className={`${titleFont.className} text-2xl text-kyzz-dark font-normal`}>
          Tu lista está vacía
        </p>
        <p className="text-sm text-kyzz-muted max-w-xs leading-relaxed">
          Guarda las prendas que te gustan tocando el corazón en cualquier producto.
        </p>
        <Link href="/products" className="btn-primary mt-2 inline-block">
          Ver colección
        </Link>
      </div>
    );
  }

  return (
    <>
      {mounted && (
        <div className="flex justify-end mt-8 mb-4">
          <GridLayoutSelector
            columns={effectiveCols}
            onChange={handleChange}
            isMobile={isMobile}
          />
        </div>
      )}

      {isListView ? (
        <div className="divide-y divide-kyzz-secondary">
          {displayedProducts.map((product) => (
            <WishlistListItem key={product.id} product={product} onRemove={toggle} />
          ))}
        </div>
      ) : (
        <div className={`grid ${colsMap[effectiveCols]} gap-x-4 gap-y-8`}>
          {displayedProducts.map((product) => (
            <WishlistCard key={product.id} product={product} onRemove={toggle} />
          ))}
        </div>
      )}
    </>
  );
};

// ── Tarjeta individual extraída para evitar re-renders del padre al hacer toggle
interface CardProps {
  product:  WishlistProduct;
  onRemove: (id: string) => void;
}

// ── Vista de lista (cols=1) — espejo de ProductGridItem listView ──────────────
const WishlistListItem = ({ product, onRemove }: CardProps) => (
  <article className="group flex gap-5 py-5">
    <div className="relative shrink-0 w-24 h-32 sm:w-32 sm:h-44 overflow-hidden bg-kyzz-tertiary">
      <Link href={`/product/${product.slug}`} className="block relative w-full h-full">
        <Image
          src={imgSrc(product)}
          alt={product.title}
          fill
          sizes="128px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </Link>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); onRemove(product.id); }}
        aria-label="Quitar de favoritos"
        className="absolute top-1.5 right-1.5 z-10 w-6 h-6 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-white transition-colors group/btn"
      >
        <IoHeart size={12} className="text-kyzz-dark group-hover/btn:hidden" />
        <IoHeartOutline size={12} className="text-kyzz-muted hidden group-hover/btn:block" />
      </button>
    </div>

    <div className="flex flex-col gap-1.5 py-1 flex-1 min-w-0">
      <Link
        href={`/product/${product.slug}`}
        className="block text-sm text-kyzz-dark hover:text-kyzz-primary transition-colors truncate"
      >
        {product.title}
      </Link>
      {product.description && (
        <p className="text-[12px] text-kyzz-muted leading-relaxed line-clamp-2 hidden sm:block">
          {product.description}
        </p>
      )}
      <span className="text-sm text-kyzz-muted mt-auto">{currencyFormat(product.price)}</span>
    </div>
  </article>
);

// ── Vista de grid ──────────────────────────────────────────────────────────────
const WishlistCard = ({ product, onRemove }: CardProps) => (
  <article className="group fade-in">
    <div className="relative aspect-[3/4] overflow-hidden bg-kyzz-tertiary">
      <Link href={`/product/${product.slug}`} className="block relative w-full h-full">
        <Image
          src={imgSrc(product)}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </Link>

      {/* Botón quitar favorito */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); onRemove(product.id); }}
        aria-label="Quitar de favoritos"
        className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-white transition-colors group/btn"
      >
        <IoHeart size={15} className="text-kyzz-dark group-hover/btn:hidden" />
        <IoHeartOutline size={15} className="text-kyzz-muted hidden group-hover/btn:block" />
      </button>
    </div>

    <div className="pt-3">
      <Link
        href={`/product/${product.slug}`}
        className="block text-sm text-kyzz-dark hover:text-kyzz-primary transition-colors truncate"
      >
        {product.title}
      </Link>
      <span className="text-sm text-kyzz-muted">{currencyFormat(product.price)}</span>
    </div>
  </article>
);
