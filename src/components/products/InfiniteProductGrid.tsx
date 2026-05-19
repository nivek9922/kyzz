"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Size } from "@prisma/client";
import type { Product } from "@/interfaces";
import type {
  ProductColorsMap,
  SortOption,
} from "@/actions/product/product-pagination";
import { getPaginatedProductsWithImages } from "@/actions/product/product-pagination";
import { getFeaturedProductsPaginated } from "@/actions/product/get-featured-products-paginated";
import { ProductGridWithLayout } from "./product-grid/ProductGridWithLayout";
import { useGridLayout } from "@/hooks/useGridLayout";
import type { Columns } from "./product-grid/ProductGrid";

interface Props {
  initialProducts:      Product[];
  initialVariantColors: ProductColorsMap;
  totalPages:           number;
  // Filtros activos — cuando cambian se hace reset completo
  categoryId?:  string;
  sizes?:       Size[];
  minPrice?:    number;
  maxPrice?:    number;
  sortBy?:      SortOption;
  colorNames?:  string[];
  isFeatured?:  boolean;
}

const skeletonColsClass: Record<Columns, string> = {
  0: 'grid-cols-1',
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
  6: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6',
};

// ── Skeleton de cards mientras carga la siguiente página ──────────────────────
function LoadingSkeleton({ cols, gap, isListView }: { cols: Columns; gap: string; isListView: boolean }) {
  if (isListView) {
    return (
      <div className="flex flex-col gap-3 mt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse flex gap-4 py-4 border-t border-kyzz-secondary/40">
            <div className="shrink-0 w-24 h-32 bg-kyzz-secondary/40" />
            <div className="flex-1 py-1 space-y-2">
              <div className="h-3 w-3/4 bg-kyzz-secondary/30" />
              <div className="h-3 w-1/3 bg-kyzz-secondary/20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${skeletonColsClass[cols]} ${gap} mt-6`}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] bg-kyzz-secondary/40" />
          <div className="h-3 w-3/4 bg-kyzz-secondary/30 mt-3" />
          <div className="h-3 w-1/2 bg-kyzz-secondary/20 mt-2" />
        </div>
      ))}
    </div>
  );
}

// ── Fin de colección ──────────────────────────────────────────────────────────
function EndOfCollection() {
  return (
    <div className="py-16 text-center">
      <p className="text-[10px] tracking-[0.4em] uppercase text-kyzz-muted/50">
        — Fin de la colección —
      </p>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function InfiniteProductGrid({
  initialProducts,
  initialVariantColors,
  totalPages,
  categoryId,
  sizes,
  minPrice,
  maxPrice,
  sortBy,
  colorNames,
  isFeatured = false,
}: Props) {
  const [products,      setProducts]      = useState<Product[]>(initialProducts);
  const [variantColors, setVariantColors] = useState<ProductColorsMap>(initialVariantColors);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [isLoading,     setIsLoading]     = useState(false);
  const [hasMore,       setHasMore]       = useState(totalPages > 1);

  // Sentinel para IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Ref para evitar doble-fetch en strict mode / hot-reload
  const loadingRef = useRef(false);

  // ── Reset cuando cambian los filtros (props) ─────────────────────────────
  const serializedSizes      = sizes?.join(",") ?? "";
  const serializedColorNames = colorNames?.join(",") ?? "";

  useEffect(() => {
    setProducts(initialProducts);
    setVariantColors(initialVariantColors);
    setCurrentPage(1);
    setHasMore(totalPages > 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    categoryId,
    serializedSizes,
    minPrice,
    maxPrice,
    sortBy,
    serializedColorNames,
    // initialProducts y initialVariantColors no van en deps para evitar loops;
    // los cambios reales llegan por los filtros anteriores.
  ]);

  // ── Función de carga de siguiente página ─────────────────────────────────
  const loadNextPage = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoading(true);

    try {
      const nextPage = currentPage + 1;

      if (isFeatured) {
        const data = await getFeaturedProductsPaginated({ page: nextPage });
        setProducts((prev) => [...prev, ...data.products]);
        setVariantColors((prev) => ({ ...prev, ...data.variantColors }));
        setCurrentPage(nextPage);
        if (nextPage >= data.totalPages) setHasMore(false);
      } else {
        const data = await getPaginatedProductsWithImages({
          page:       nextPage,
          categoryId,
          sizes:      sizes && sizes.length > 0 ? sizes : undefined,
          minPrice,
          maxPrice,
          sortBy,
          colorNames: colorNames && colorNames.length > 0 ? colorNames : undefined,
        });
        setProducts((prev) => [...prev, ...data.products]);
        setVariantColors((prev) => ({ ...prev, ...data.variantColors }));
        setCurrentPage(nextPage);
        if (nextPage >= data.totalPages) setHasMore(false);
      }
    } catch (error) {
      console.error("[InfiniteProductGrid] Error cargando página:", error);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [
    currentPage,
    hasMore,
    isFeatured,
    categoryId,
    sizes,
    minPrice,
    maxPrice,
    sortBy,
    colorNames,
  ]);

  // ── IntersectionObserver sobre el sentinel ────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loadingRef.current) {
          void loadNextPage();
        }
      },
      {
        rootMargin: "200px", // Activar 200px antes de que sea visible
        threshold:  0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadNextPage]);

  // ── Layout compartido entre grid y skeleton ──────────────────────────────
  const layout = useGridLayout({
    storageKeyMobile:  "kyzz-grid-cols-mobile",
    storageKeyDesktop: "kyzz-grid-cols-desktop",
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Grid completo con todos los productos acumulados */}
      <ProductGridWithLayout
        products={products}
        variantColors={variantColors}
        externalLayout={layout}
      />

      {/* Sentinel invisible — el observer lo vigila */}
      <div ref={sentinelRef} aria-hidden="true" />

      {/* Estado: cargando más — mismo layout que el grid activo */}
      {isLoading && (
        <LoadingSkeleton
          cols={layout.effectiveCols}
          gap={layout.gapClass}
          isListView={layout.isListView}
        />
      )}

      {/* Estado: fin de colección */}
      {!hasMore && !isLoading && products.length > 0 && <EndOfCollection />}
    </div>
  );
}
