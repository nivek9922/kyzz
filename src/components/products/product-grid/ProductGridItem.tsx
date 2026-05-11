'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { Product } from '@/interfaces';
import { currencyFormat } from '@/utils';

interface Props {
  product: Product;
}

const imgSrc = (url: string) =>
  url.startsWith('http') ? url : `/products/${url}`;

export const ProductGridItem = ({ product }: Props) => {
  const [displayImage, setDisplayImage] = useState(product.images[0]);
  const hasSecondImage = product.images.length > 1;

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