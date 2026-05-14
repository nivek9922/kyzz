'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { Product } from '@/interfaces';
import { currencyFormat } from '@/utils';

interface Props {
  product: Product;
  listView?: boolean;
}

const imgSrc = (url: string) =>
  url.startsWith('http') ? url : `/products/${url}`;

export const ProductGridItem = ({ product, listView = false }: Props) => {
  const [displayImage, setDisplayImage] = useState(product.images[0]);
  const hasSecondImage = product.images.length > 1;

  if (listView) {
    return (
      <article className="group fade-in flex gap-5 py-5 border-b border-kyzz-secondary">
        <Link href={`/product/${product.slug}`} className="shrink-0 overflow-hidden">
          <div className="relative w-24 h-32 sm:w-32 sm:h-44 overflow-hidden bg-kyzz-tertiary">
            <Image
              src={imgSrc(displayImage)}
              alt={product.title}
              fill
              sizes="128px"
              className="object-cover transition-all duration-500 group-hover:scale-105"
              onMouseEnter={() => hasSecondImage && setDisplayImage(product.images[1])}
              onMouseLeave={() => setDisplayImage(product.images[0])}
            />
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
          </div>
          <span className="text-sm text-kyzz-muted mt-3">
            {currencyFormat(product.price)}
          </span>
        </div>
      </article>
    );
  }

  return (
    <article className="group fade-in">
      <Link href={`/product/${product.slug}`} className="block overflow-hidden">
        <div className="relative aspect-[3/4] overflow-hidden bg-kyzz-tertiary">
          <Image
            src={imgSrc(displayImage)}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-all duration-500 group-hover:scale-105"
            onMouseEnter={() => hasSecondImage && setDisplayImage(product.images[1])}
            onMouseLeave={() => setDisplayImage(product.images[0])}
          />
        </div>
      </Link>

      <div className="pt-4 pb-2">
        <Link
          href={`/product/${product.slug}`}
          className="block text-sm text-kyzz-dark hover:text-kyzz-primary transition-colors duration-200 truncate"
        >
          {product.title}
        </Link>
        <span className="block mt-1 text-sm text-kyzz-muted">
          {currencyFormat(product.price)}
        </span>
      </div>
    </article>
  );
};
