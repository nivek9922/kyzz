'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IoHeartDislikeOutline } from 'react-icons/io5';
import { useWishlistStore } from '@/store';
import { getWishlistProducts } from '@/actions/product/get-wishlist-products';
import { GridLayoutSelector, ProductGridItem } from '@/components';
import { useGridLayout } from '@/hooks/useGridLayout';
import { imageSizesMap, type Columns } from '@/components/products/product-grid/ProductGrid';
import type { ProductColorEntry } from '@/actions/product/product-pagination';
import { currencyFormat } from '@/utils';
import { titleFont } from '@/config/fonts';
import type { Product } from '@/interfaces';

const colsMap: Record<Columns, string> = {
  0: 'grid-cols-1',
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
  6: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6',
};

interface CachedEntry {
  product: Product;
  colors:  ProductColorEntry[] | undefined;
}

export const WishlistContent = () => {
  const { items } = useWishlistStore();

  const { isMobile, effectiveCols, mounted, isListView, handleChange } = useGridLayout({
    storageKeyMobile:  'kyzz-wishlist-cols-mobile',
    storageKeyDesktop: 'kyzz-wishlist-cols-desktop',
  });

  // Cache: ID → { product, colors }
  const [cache, setCache] = useState<Map<string, CachedEntry>>(new Map());
  const [initialLoading, setInitialLoading] = useState(true);
  const [, startTransition] = useTransition();
  const columnsReady = useRef(false);
  useEffect(() => { columnsReady.current = true; }, []);

  useEffect(() => {
    const missing = items.filter((id) => !cache.has(id));

    if (missing.length === 0) {
      setInitialLoading(false);
      return;
    }

    const isFirstLoad = cache.size === 0 && items.length > 0;
    if (isFirstLoad) setInitialLoading(true);

    startTransition(() => {
      getWishlistProducts(missing).then(({ products, variantColors }) => {
        setCache((prev) => {
          const next = new Map(prev);
          for (const p of products) {
            next.set(p.id, { product: p, colors: variantColors[p.id] });
          }
          return next;
        });
        setInitialLoading(false);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const displayed = useMemo(
    () => items.map((id) => cache.get(id)).filter((e): e is CachedEntry => !!e),
    [items, cache],
  );

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

  if (displayed.length === 0) {
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
          {displayed.map(({ product, colors }) => (
            <WishlistListItem key={product.id} product={product} colors={colors} />
          ))}
        </div>
      ) : (
        <div className={`grid ${colsMap[effectiveCols]} gap-x-4 gap-y-8`}>
          {displayed.map(({ product, colors }) => (
            <ProductGridItem
              key={product.id}
              product={product}
              colorVariants={colors}
              listName="wishlist"
              // sizes según las columnas activas (evita servir imágenes sub-dimensionadas)
              imageSizes={imageSizesMap[effectiveCols]}
              // sin priority: las columnas vienen de localStorage y la data se carga async,
              // los preloads SSR quedarían obsoletos → "preloaded but not used"
            />
          ))}
        </div>
      )}
    </>
  );
};

// ── Vista lista compacta ──
const WishlistListItem = ({
  product,
  colors,
}: {
  product: Product;
  colors?: ProductColorEntry[];
}) => {
  // Misma cadena de fallback que el grid: imagen legacy → imagen del primer color/variante
  const imgUrl = product.images[0] ?? colors?.[0]?.image ?? undefined;
  const src = !imgUrl
    ? '/imgs/placeholder.jpg'
    : imgUrl.startsWith('http') || imgUrl.startsWith('/')
      ? imgUrl
      : `/products/${imgUrl}`;

  return (
    <article className="group flex gap-5 py-5">
      <div className="relative shrink-0 w-24 h-32 sm:w-32 sm:h-44 overflow-hidden bg-kyzz-tertiary">
        <Link href={`/product/${product.slug}`} className="block relative w-full h-full">
          <Image
            src={src}
            alt={product.title}
            fill
            sizes="128px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
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
};
