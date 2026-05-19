'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { Product } from '@/interfaces';
import { currencyFormat } from '@/utils';
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
}

const PLACEHOLDER = '/imgs/placeholder.jpg';
const imgSrc = (url: string | null | undefined) =>
  !url ? PLACEHOLDER
  : url.startsWith('http') || url.startsWith('/') ? url
  : `/products/${url}`;

// ── Card grid normal ──────────────────────────────────────────────────────────
export const ProductGridItem = ({ product, listView = false, colorVariants = [], compactMode = false, imageSizes }: Props) => {
  const hasColors     = colorVariants.length > 0;
  const firstColorImg = hasColors && colorVariants[0].image ? colorVariants[0].image : null;
  const isSoldOut     = (product.inStock ?? 0) <= 0;

  // Imagen principal: primera imagen del primer color si existe, si no la del producto
  const defaultImage  = firstColorImg ?? product.images[0];
  const secondImage   = !hasColors && product.images.length > 1 ? product.images[1] : null;

  const [mainImage, setMainImage]       = useState(defaultImage);
  const [activeColor, setActiveColor]   = useState(hasColors ? colorVariants[0].id : null);

  const handleColorHover = (c: ProductColorEntry) => {
    if (c.image) setMainImage(c.image);
    setActiveColor(c.id);
  };

  const handleMouseLeave = () => {
    // Mantiene el color seleccionado al salir
  };

  if (listView) {
    return (
      <article className="group fade-in flex gap-5 py-5 border-b border-kyzz-secondary">
        <Link href={`/product/${product.slug}`} className="shrink-0 overflow-hidden">
          <div className="relative w-24 h-32 sm:w-32 sm:h-44 overflow-hidden bg-kyzz-tertiary">
            <Image
              src={imgSrc(mainImage)}
              alt={product.title}
              fill
              sizes="128px"
              className={`object-cover transition-all duration-500 group-hover:scale-105 ${isSoldOut ? 'opacity-60' : ''}`}
            onError={() => setMainImage(PLACEHOLDER)}
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
                onLeave={handleMouseLeave}
              />
            )}
          </div>
          <span className="text-sm text-kyzz-muted mt-3">{currencyFormat(product.price)}</span>
        </div>
      </article>
    );
  }

  return (
    <article className="group fade-in">
      <Link href={`/product/${product.slug}`} className="block overflow-hidden">
        <div
          className="relative aspect-[3/4] overflow-hidden bg-kyzz-tertiary"
          onMouseLeave={() => {
            if (!hasColors && secondImage) setMainImage(product.images[0]);
          }}
        >
          <Image
            src={imgSrc(mainImage)}
            alt={product.title}
            fill
            sizes={imageSizes ?? '(max-width: 640px) 50vw, 33vw'}
            className={`object-cover transition-all duration-500 group-hover:scale-105 ${isSoldOut ? 'opacity-60' : ''}`}
            onError={() => setMainImage(PLACEHOLDER)}
            onMouseEnter={() => {
              if (!hasColors && secondImage) setMainImage(secondImage);
            }}
            onMouseLeave={() => {
              if (!hasColors && secondImage) setMainImage(product.images[0]);
            }}
          />
          {isSoldOut && (
            <span className="absolute top-2 left-2 bg-kyzz-dark/85 text-white text-[9px] tracking-[0.25em] uppercase px-2 py-1">
              Agotado
            </span>
          )}
          <WishlistButton productId={product.id} />
        </div>
      </Link>

      <div className={compactMode ? 'pt-2 pb-1' : 'pt-3 pb-2'}>
        <Link
          href={`/product/${product.slug}`}
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
            onLeave={handleMouseLeave}
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
  <div className={`flex items-center flex-wrap ${compact ? 'gap-1 mt-1.5' : 'gap-1.5 mt-2.5'}`}>
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
          className={`relative ${size} rounded-full overflow-hidden transition-all duration-200 shrink-0 ${
            isActive
              ? 'ring-2 ring-offset-1 ring-kyzz-dark scale-110'
              : 'ring-1 ring-kyzz-secondary hover:scale-110 hover:ring-kyzz-muted'
          }`}
        >
          {c.image ? (
            <Image
              src={imgSrc(c.image)}
              alt={c.name}
              fill
              sizes="28px"
              className="object-cover"
            />
          ) : (
            /* Fallback: círculo de color sólido */
            <span
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: c.hex }}
            />
          )}
          {/* Overlay sutil para dar profundidad */}
          <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10" />
        </button>
      );
    })}
  </div>
);
