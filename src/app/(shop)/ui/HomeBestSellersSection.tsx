import Link from 'next/link';
import { ViewItemListTracker } from '@/components';
import { ProductScrollRow } from './ProductScrollRow';
import type { ProductColorsMap } from '@/actions/product/product-pagination';
import type { Product } from '@/interfaces';

interface Props {
  products:      Product[];
  variantColors: ProductColorsMap;
}

export function HomeBestSellersSection({ products, variantColors }: Props) {
  if (products.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-12 md:py-20">

      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">
            Más pedidas
          </p>
          <h2 className="font-serif text-3xl text-kyzz-dark">Las más elegidas</h2>
          <div className="kyzz-divider-left mt-4" />
        </div>
        <Link
          href="/products"
          className="text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
        >
          Ver todo
        </Link>
      </div>

      <ViewItemListTracker listName="mas_querido" products={products} />
      <ProductScrollRow products={products} variantColors={variantColors} listName="mas_querido" />

    </section>
  );
}
