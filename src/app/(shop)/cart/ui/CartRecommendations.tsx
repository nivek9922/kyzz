'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store';
import { getCartRecommendations, type RecommendedProduct } from '@/actions/product/get-cart-recommendations';
import { currencyFormat } from '@/utils';
import { titleFont } from '@/config/fonts';

const imgSrc = (url: string) =>
  !url
    ? '/imgs/placeholder.jpg'
    : url.startsWith('http')
    ? url
    : `/products/${url}`;

export function CartRecommendations() {
  const cart = useCartStore((s) => s.cart);
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [isPending, startTransition] = useTransition();

  const cartIdsKey = [...new Set(cart.map((i) => i.id))].sort().join(',');

  useEffect(() => {
    const uniqueIds = [...new Set(cart.map((i) => i.id))];
    if (uniqueIds.length === 0) {
      setRecommendations([]);
      return;
    }
    startTransition(async () => {
      const results = await getCartRecommendations(uniqueIds);
      setRecommendations(results);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartIdsKey]);

  if (!isPending && recommendations.length === 0) return null;

  return (
    <section className="mt-16 pt-12 border-t border-kyzz-secondary">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-kyzz-secondary" />
        <div className="text-center">
          <p className="text-[9px] tracking-[0.4em] uppercase text-kyzz-muted">para ti</p>
          <h2 className={`${titleFont.className} text-lg font-normal text-kyzz-dark mt-0.5`}>
            Completa tu outfit
          </h2>
        </div>
        <div className="flex-1 h-px bg-kyzz-secondary" />
      </div>

      {/* Loading skeleton */}
      {isPending && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[3/4] bg-kyzz-secondary/40 animate-pulse" />
              <div className="mt-2 space-y-1.5">
                <div className="h-2 bg-kyzz-secondary/40 animate-pulse w-3/4" />
                <div className="h-2 bg-kyzz-secondary/40 animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations grid */}
      {!isPending && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
          {recommendations.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="group"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-kyzz-tertiary">
                <Image
                  src={imgSrc(product.image)}
                  alt={product.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="mt-2">
                <p className="text-[10px] tracking-wide text-kyzz-dark truncate group-hover:text-kyzz-primary transition-colors">
                  {product.title}
                </p>
                <p className="text-[10px] text-kyzz-muted mt-0.5">
                  {currencyFormat(product.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
