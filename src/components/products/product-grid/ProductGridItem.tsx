'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { Product } from '@/interfaces';

interface Props {
  product: Product;
}

export const ProductGridItem = ({ product }: Props) => {
  const [displayImage, setDisplayImage] = useState(product.images[0]);

  return (
    <article className="group fade-in">
      <Link href={`/product/${product.slug}`} className="block overflow-hidden">
        <div className="relative aspect-[3/4] overflow-hidden bg-kyzz-tertiary">
          <Image
            src={`/products/${displayImage}`}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            onMouseEnter={() => setDisplayImage(product.images[1] ?? product.images[0])}
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
          ${product.price.toFixed(2)}
        </span>
      </div>
    </article>
  );
};