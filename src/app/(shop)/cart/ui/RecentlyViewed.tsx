'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore, useRecentlyViewedStore } from '@/store';
import { currencyFormat } from '@/utils';
import { titleFont } from '@/config/fonts';

const imgSrc = (url: string) =>
  !url ? '/imgs/placeholder.jpg' : url.startsWith('http') ? url : `/products/${url}`;

export function RecentlyViewed() {
  const recentItems = useRecentlyViewedStore((s) => s.items);
  const cart        = useCartStore((s) => s.cart);
  const cartIds     = useMemo(() => new Set(cart.map((i) => i.id)), [cart]);

  const toShow = useMemo(
    () => recentItems.filter((item) => !cartIds.has(item.id)).slice(0, 4),
    [recentItems, cartIds],
  );

  if (toShow.length === 0) return null;

  return (
    <section className="mt-16 pt-12 border-t border-kyzz-secondary">

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-kyzz-secondary" />
        <div className="text-center">
          <p className="text-[9px] tracking-[0.4em] uppercase text-kyzz-muted">historial</p>
          <h2 className={`${titleFont.className} text-lg font-normal text-kyzz-dark mt-0.5`}>
            Viste recientemente
          </h2>
        </div>
        <div className="flex-1 h-px bg-kyzz-secondary" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
        {toShow.map((item) => (
          <Link
            key={item.id}
            href={`/product/${item.slug}`}
            className="group"
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-kyzz-tertiary">
              <Image
                src={imgSrc(item.image)}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="mt-2">
              <p className="text-[10px] tracking-wide text-kyzz-dark truncate group-hover:text-kyzz-primary transition-colors">
                {item.title}
              </p>
              <p className="text-[10px] text-kyzz-muted mt-0.5">
                {currencyFormat(item.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>

    </section>
  );
}
