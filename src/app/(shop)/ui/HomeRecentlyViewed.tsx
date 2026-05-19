'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRecentlyViewedStore } from '@/store';
import { currencyFormat } from '@/utils';

const PLACEHOLDER = '/imgs/placeholder.jpg';

const imgSrc = (url: string) =>
  !url ? PLACEHOLDER : url.startsWith('http') || url.startsWith('/') ? url : `/products/${url}`;

export function HomeRecentlyViewed() {
  const items  = useRecentlyViewedStore((s) => s.items);
  const toShow = useMemo(() => items.slice(0, 4), [items]);

  if (toShow.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-20">

      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">
            Tu historial
          </p>
          <h2 className="font-serif text-3xl text-kyzz-dark">Viste recientemente</h2>
          <div className="kyzz-divider-left mt-4" />
        </div>
        <Link
          href="/products"
          className="text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
        >
          Ver todo
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {toShow.map((item) => (
          <Link key={item.id} href={`/product/${item.slug}`} className="group">
            <div className="relative aspect-[3/4] overflow-hidden bg-kyzz-tertiary">
              <Image
                src={imgSrc(item.image)}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
              />
            </div>
            <div className="mt-3">
              <p className="text-sm text-kyzz-dark truncate group-hover:text-kyzz-primary transition-colors">
                {item.title}
              </p>
              <p className="text-sm text-kyzz-muted mt-1">
                {currencyFormat(item.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>

    </section>
  );
}
