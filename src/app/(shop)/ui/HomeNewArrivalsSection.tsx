import Link from 'next/link';
import { ViewItemListTracker } from '@/components';
import { ProductScrollRow } from './ProductScrollRow';
import type { ProductColorsMap } from '@/actions/product/product-pagination';
import type { Product } from '@/interfaces';

interface Props {
  products:      Product[];
  variantColors: ProductColorsMap;
}

export function HomeNewArrivalsSection({ products, variantColors }: Props) {
  if (products.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-12 md:py-20">

      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">
            Últimas incorporaciones
          </p>
          <h2 className="font-serif text-3xl text-kyzz-dark">Recién llegadas</h2>
          <div className="kyzz-divider-left mt-4" />
        </div>
        <Link
          href="/products?sort=newest"
          className="text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
        >
          Ver todas
        </Link>
      </div>

      <ViewItemListTracker listName="recien_llegadas" products={products} />
      <ProductScrollRow products={products} variantColors={variantColors} listName="recien_llegadas" />

    </section>
  );
}
