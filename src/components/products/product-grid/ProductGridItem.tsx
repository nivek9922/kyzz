'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { Product } from '@/interfaces';
import { currencyFormat } from '@/utils';
import { gaSelectItem } from '@/lib/gtag';
import type { ProductColorEntry } from '@/actions/product/product-pagination';
import { WishlistButton } from './WishlistButton';

interface Props {
  product:        Product;
  listView?:      boolean;
  colorVariants?: ProductColorEntry[];
  /** En 3 columnas mobile el espacio es reducido: texto más pequeño, swatches más chicos */
  compactMode?:   boolean;
  /** Hint para el srcset: debe coincidir con el tamaño visual real según las columnas activas */
  imageSizes?:    string;
  /** Precarga la imagen (above-fold) para mejorar LCP. Solo en las primeras del grid. */
  priority?:      boolean;
  /** Nombre de la lista para atribución GA4 (select_item). */
  listName?:      string;
}

const PLACEHOLDER = '/imgs/placeholder.jpg';
const imgSrc = (url: string | null | undefined) =>
  !url ? PLACEHOLDER
  : url.startsWith('http') || url.startsWith('/') ? url
  : `/products/${url}`;

// ── Card grid normal ──────────────────────────────────────────────────────────
export const ProductGridItem = ({
  product,
  listView      = false,
  colorVariants = [],
  compactMode   = false,
  imageSizes,
  priority      = false,
  listName      = 'product_list',
}: Props) => {
  const hasColors = colorVariants.length > 0;
  const isSoldOut = (product.inStock ?? 0) <= 0;

  const [activeColor, setActiveColor]     = useState(hasColors ? colorVariants[0].id : null);
  const [isShowingHover, setIsShowingHover] = useState(false);
  const [primaryError, setPrimaryError]   = useState(false);

  const activeColorEntry = hasColors
    ? (colorVariants.find((c) => c.id === activeColor) ?? colorVariants[0])
    : null;

  const primaryImage = activeColorEntry?.image      ?? product.images[0] ?? null;
  const hoverImage   = activeColorEntry?.imageHover ?? (!hasColors ? (product.images[1] ?? null) : null);

  const primarySrc = primaryError ? PLACEHOLDER : imgSrc(primaryImage);

  const handleColorHover = (c: ProductColorEntry) => setActiveColor(c.id);

  const handleSelect = () =>
    gaSelectItem({ listName, id: product.id, name: product.title, price: product.price });

  // ── Vista lista ────────────────────────────────────────────────────────────
  if (listView) {
    return (
      <article className="group fade-in flex gap-5 py-5 border-b border-kyzz-secondary">
        <Link href={`/product/${product.slug}`} onClick={handleSelect} className="shrink-0 overflow-hidden">
          <div className="relative w-24 h-32 sm:w-32 sm:h-44 overflow-hidden bg-kyzz-tertiary">
            <Image
              src={primarySrc}
              alt={product.title}
              fill
              sizes="128px"
              priority={priority}
              className={`object-cover transition-transform duration-700 ease-in-out group-hover:scale-105 ${isSoldOut ? 'opacity-60' : ''}`}
              onError={() => setPrimaryError(true)}
            />
            {isSoldOut && (
              <span className="absolute top-1.5 left-1.5 bg-kyzz-dark/85 text-white text-[8px] tracking-[0.2em] uppercase px-1.5 py-0.5">
                Agotado
              </span>
            )}
            <WishlistButton productId={product.id} />
          </div>
        </Link>

        <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
          <div>
            <Link
              href={`/product/${product.slug}`}
              onClick={handleSelect}
              className="block text-sm text-kyzz-dark hover:text-kyzz-primary transition-colors duration-200"
            >
              {product.title}
            </Link>
            <p className="mt-2 text-xs text-kyzz-muted leading-relaxed line-clamp-3">
              {product.description}
            </p>
            {hasColors && (
              <ColorSwatchRow
                colors={colorVariants}
                activeId={activeColor}
                onHover={handleColorHover}
                onLeave={() => {}}
              />
            )}
          </div>
          <span className="text-sm text-kyzz-muted mt-3">{currencyFormat(product.price)}</span>
        </div>
      </article>
    );
  }

  // ── Vista grid ─────────────────────────────────────────────────────────────
  return (
    <article className="group fade-in">
      <Link href={`/product/${product.slug}`} onClick={handleSelect} className="block">
        <div
          className="relative aspect-[3/4] overflow-hidden bg-kyzz-tertiary"
          onMouseEnter={() => { if (hoverImage) setIsShowingHover(true); }}
          onMouseLeave={() => setIsShowingHover(false)}
          onTouchStart={() => { if (hoverImage) setIsShowingHover(true); }}
          onTouchEnd={() => setIsShowingHover(false)}
        >
          {/* Imagen principal — siempre visible */}
          <Image
            src={primarySrc}
            alt={product.title}
            fill
            sizes={imageSizes ?? '(max-width: 640px) 50vw, 33vw'}
            priority={priority}
            className={`object-cover transition-transform duration-700 ease-in-out group-hover:scale-[1.03] ${isSoldOut ? 'opacity-60' : ''}`}
            onError={() => setPrimaryError(true)}
          />

          {/* Imagen hover — cross-fade suave encima de la principal */}
          {hoverImage && (
            <Image
              src={imgSrc(hoverImage)}
              alt=""
              aria-hidden="true"
              fill
              sizes={imageSizes ?? '(max-width: 640px) 50vw, 33vw'}
              className={`object-cover absolute inset-0 transition-opacity duration-[550ms] ease-in-out ${
                isShowingHover
                  ? (isSoldOut ? 'opacity-60' : 'opacity-100')
                  : 'opacity-0'
              }`}
            />
          )}

          {isSoldOut && (
            <span className="absolute top-2 left-2 bg-kyzz-dark/85 text-white text-[9px] tracking-[0.25em] uppercase px-2 py-1">
              Agotado
            </span>
          )}
          <WishlistButton productId={product.id} />

          {/* Overlay de tallas — solo visible en hover desktop */}
          {!isSoldOut && product.sizes.length > 0 && (
            <div
              className="absolute inset-x-0 bottom-0 bg-white/90 backdrop-blur-[1px] px-3 py-2
                         text-center text-[10px] tracking-[0.2em] uppercase text-kyzz-dark
                         transition-opacity duration-300
                         opacity-0 md:group-hover:opacity-100 pointer-events-none"
            >
              {product.sizes.join(' · ')}
            </div>
          )}
        </div>
      </Link>

      <div className={compactMode ? 'pt-2 pb-1' : 'pt-3 pb-2'}>
        <Link
          href={`/product/${product.slug}`}
          onClick={handleSelect}
          className={`block text-kyzz-dark hover:text-kyzz-primary transition-colors duration-200 truncate ${
            compactMode ? 'text-[11px] leading-snug' : 'text-sm'
          }`}
        >
          {product.title}
        </Link>

        <span className={`block mt-0.5 text-kyzz-muted ${compactMode ? 'text-[11px]' : 'text-sm mt-1'}`}>
          {currencyFormat(product.price)}
        </span>

        {hasColors && (
          <ColorSwatchRow
            colors={colorVariants}
            activeId={activeColor}
            onHover={handleColorHover}
            onLeave={() => {}}
            compact={compactMode}
          />
        )}
      </div>
    </article>
  );
};

// ── Fila de swatches con miniatura circular ───────────────────────────────────
interface SwatchRowProps {
  colors:   ProductColorEntry[];
  activeId: string | null;
  onHover:  (c: ProductColorEntry) => void;
  onLeave:  () => void;
  compact?: boolean;
}

const ColorSwatchRow = ({ colors, activeId, onHover, onLeave, compact = false }: SwatchRowProps) => (
  <div className={`flex items-center flex-wrap pl-1.5 ${compact ? 'gap-1 mt-1.5' : 'gap-1.5 mt-2.5'}`}>
    {colors.map((c) => {
      const isActive = c.id === activeId;
      const size     = compact ? 'w-5 h-5' : 'w-7 h-7';
      return (
        <button
          key={c.id}
          type="button"
          title={c.name}
          aria-label={c.name}
          onMouseEnter={() => onHover(c)}
          onMouseLeave={onLeave}
          onClick={(e) => { e.preventDefault(); onHover(c); }}
          className={`relative ${size} rounded-full transition-all duration-200 shrink-0 ${
            isActive
              ? 'ring-2 ring-offset-1 ring-kyzz-dark scale-110'
              : 'ring-1 ring-kyzz-secondary hover:scale-110 hover:ring-kyzz-muted'
          }`}
        >
          {/* Recorte circular en un div interior para no clipear el ring externo */}
          <span className="absolute inset-0 rounded-full overflow-hidden">
            {c.image ? (
              <Image
                src={imgSrc(c.image)}
                alt={c.name}
                fill
                sizes="28px"
                className="object-cover"
              />
            ) : (
              <span
                className="absolute inset-0"
                style={{ backgroundColor: c.hex }}
              />
            )}
          </span>
          {/* Overlay sutil para dar profundidad */}
          <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10" />
        </button>
      );
    })}
  </div>
);
