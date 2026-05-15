'use client';

import { useMemo, useState } from 'react';
import { ProductMobileSlideshow, ProductSlideshow, StockLabel } from '@/components';
import { currencyFormat } from '@/utils';
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
  product:  Product;
  colors:   ColorVariantData[];
  variants: VariantData[];
}

export const ProductDetailClient = ({ product, colors, variants }: Props) => {

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
        <ProductMobileSlideshow
          key={`mobile-${selectedColorId ?? 'base'}`}
          title={product.title}
          images={currentImages}
          className="block md:hidden"
        />
        <ProductSlideshow
          key={`desktop-${selectedColorId ?? 'base'}`}
          title={product.title}
          images={currentImages}
          className="hidden md:block"
        />
      </div>

      {/* ── Info ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">

        <StockLabel slug={product.slug} />

        <div>
          <h1 className="font-serif text-3xl text-kyzz-dark leading-snug">{product.title}</h1>
          <p className="mt-2 text-xl text-kyzz-primary font-light">{currencyFormat(product.price)}</p>
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
