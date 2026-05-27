'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { IoStar, IoStarHalf, IoStarOutline } from 'react-icons/io5';
import { StockLabel } from '@/components';

const SlideshowSkeleton = () => (
  <div className="w-full aspect-[3/4] bg-kyzz-secondary/30 animate-pulse" />
);

const ProductMobileSlideshow = dynamic(
  () => import('@/components/product/slideshow/ProductMobileSlideshow').then((m) => ({ default: m.ProductMobileSlideshow })),
  { ssr: false, loading: SlideshowSkeleton },
);
const ProductSlideshow = dynamic(
  () => import('@/components/product/slideshow/ProductSlideshow').then((m) => ({ default: m.ProductSlideshow })),
  { ssr: false, loading: SlideshowSkeleton },
);
import { currencyFormat } from '@/utils';
import { useRecentlyViewedStore } from '@/store';
import { AddToCart } from './AddToCart';
import { ProductTabs } from './ProductTabs';
import type { Product, Size } from '@/interfaces';

export interface ColorVariantData {
  id:             string;
  paletteColorId: string;
  paletteColor: { id: string; name: string; hex: string };
  images: { id: string; url: string }[];
}

export interface VariantData {
  id:      string;
  colorId: string | null;
  size:    Size;
  stock:   number;
}

interface Props {
  product:        Product;
  colors:         ColorVariantData[];
  variants:       VariantData[];
  reviewSummary?: { average: number; count: number };
}

export const ProductDetailClient = ({ product, colors, variants, reviewSummary }: Props) => {

  const addRecentlyViewed = useRecentlyViewedStore((s) => s.addItem);

  // ── Seleccionar primer color disponible (con al menos una variante con stock > 0 si es posible) ──
  const initialColorId = useMemo(() => {
    if (colors.length === 0) return null;
    const withStock = colors.find((c) => variants.some((v) => v.colorId === c.id && v.stock > 0));
    return (withStock ?? colors[0]).id;
  }, [colors, variants]);

  const [selectedColorId, setSelectedColorId] = useState<string | null>(initialColorId);

  const selectedColor = colors.find((c) => c.id === selectedColorId) ?? null;

  // ── Imágenes: del color seleccionado, si no las del producto ──
  const currentImages =
    selectedColor && selectedColor.images.length > 0
      ? selectedColor.images.map((i) => i.url)
      : product.images;

  // ── Capturar imagen inicial (antes de cualquier cambio de color) para el registro ──
  const initialImageRef = useRef(currentImages[0] ?? '');

  // ── Registrar visita una sola vez al montar (no se repite al cambiar color) ──
  useEffect(() => {
    addRecentlyViewed({
      id:    product.id,
      slug:  product.slug,
      title: product.title,
      price: product.price,
      image: initialImageRef.current,
    });
  // product.id identifica unívocamente esta página — dispara solo en mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // ── Variantes filtradas al color actual (o sin color) ──
  const visibleVariants = useMemo(
    () => variants.filter((v) => v.colorId === selectedColorId),
    [variants, selectedColorId]
  );

  // ── Tallas disponibles para el color actual ──
  const availableSizes = useMemo(() => {
    const set = new Set<Size>();
    for (const v of visibleVariants) set.add(v.size);
    return Array.from(set);
  }, [visibleVariants]);

  // ── Map talla → stock (para PDP marcar agotados) ──
  const stockBySize = useMemo(() => {
    const map: Partial<Record<Size, number>> = {};
    for (const v of visibleVariants) map[v.size] = v.stock;
    return map;
  }, [visibleVariants]);

  // ── ¿Tiene algún color stock? para deshabilitar swatches agotados ──
  const isColorOutOfStock = (colorId: string) =>
    variants.filter((v) => v.colorId === colorId).every((v) => v.stock <= 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">

      {/* ── Slideshow ────────────────────────────────────────────── */}
      <div>
        {/* Mobile */}
        <div className="md:hidden">
          <ProductMobileSlideshow
            title={product.title}
            images={currentImages}
          />
        </div>
        {/* Desktop — el wrapper div oculta en mobile, el CSS del slideshow maneja el flex layout */}
        <div className="hidden md:block">
          <ProductSlideshow
            title={product.title}
            images={currentImages}
          />
        </div>
      </div>

      {/* ── Info ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">

        <StockLabel slug={product.slug} />

        <div>
          <h1 className="font-serif text-3xl text-kyzz-dark leading-snug">{product.title}</h1>
          <p className="mt-2 text-xl text-kyzz-primary font-light">{currencyFormat(product.price)}</p>
          {reviewSummary && reviewSummary.count > 0 && (
            <a
              href="#reseñas"
              className="inline-flex items-center gap-2 mt-3 group"
              aria-label={`${reviewSummary.average.toFixed(1)} de 5 estrellas, ${reviewSummary.count} reseñas`}
            >
              <Stars value={reviewSummary.average} />
              <span className="text-xs text-kyzz-muted group-hover:text-kyzz-primary transition-colors">
                {reviewSummary.count} {reviewSummary.count === 1 ? 'reseña' : 'reseñas'}
              </span>
            </a>
          )}
        </div>

        {/* Controles: color + talla + cantidad + botones — agrupados sin dividers */}
        <div className="flex flex-col gap-3">

          {/* Selector de color */}
          {colors.length > 0 && (
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted mb-2">
                Color
                {selectedColor && (
                  <span className="ml-2 normal-case text-kyzz-dark">{selectedColor.paletteColor.name}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {colors.map((c) => {
                  const sold = isColorOutOfStock(c.id);
                  const active = selectedColorId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedColorId(c.id)}
                      title={`${c.paletteColor.name}${sold ? ' (agotado)' : ''}`}
                      aria-label={c.paletteColor.name}
                      className={`relative w-7 h-7 rounded-full transition-all duration-200 hover:scale-110 ${
                        active
                          ? 'ring-2 ring-offset-2 ring-kyzz-dark scale-110'
                          : 'ring-1 ring-kyzz-secondary hover:ring-kyzz-muted'
                      } ${sold ? 'opacity-40' : ''}`}
                      style={{ backgroundColor: c.paletteColor.hex }}
                    >
                      <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10" />
                      {sold && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="w-9 h-px bg-kyzz-dark rotate-45 absolute" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <AddToCart
            product={product}
            variants={visibleVariants}
            availableSizes={availableSizes}
            stockBySize={stockBySize}
            colorName={selectedColor?.paletteColor.name}
            imageForCart={currentImages[0]}
          />

        </div>

        <div className="kyzz-divider" />

        <div>
          <h3 className="text-xs tracking-widest uppercase text-kyzz-muted mb-2">Descripción</h3>
          <p className="text-sm text-kyzz-dark leading-relaxed">{product.description}</p>
        </div>

        <ProductTabs />
      </div>
    </div>
  );
};

// ── Estrellas compactas para el header de la PDP ───────────────────────────────
const Stars = ({ value }: { value: number }) => {
  const full  = Math.floor(value);
  const half  = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5 text-kyzz-primary">
      {Array.from({ length: full  }).map((_, i) => <IoStar         key={`f${i}`} size={14} />)}
      {half  && <IoStarHalf size={14} />}
      {Array.from({ length: empty }).map((_, i) => <IoStarOutline  key={`e${i}`} size={14} className="text-kyzz-secondary" />)}
    </div>
  );
};
