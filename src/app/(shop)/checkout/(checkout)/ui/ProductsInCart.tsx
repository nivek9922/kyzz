'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/store';
import { currencyFormat } from '@/utils';
import { ProductImage } from '@/components';

export const ProductsInCart = () => {
  const [loaded, setLoaded] = useState(false);
  const productsInCart = useCartStore((state) => state.cart);

  useEffect(() => { setLoaded(true); }, []);

  if (!loaded) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-5">
            <div className="w-20 h-24 bg-kyzz-secondary/40 shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 bg-kyzz-secondary/40 w-2/3" />
              <div className="h-3 bg-kyzz-secondary/40 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-kyzz-secondary">
      {productsInCart.map((product) => (
        <div key={product.variantId} className="flex gap-5 py-5">
          <ProductImage
            src={product.image}
            width={80}
            height={96}
            alt={product.title}
            className="object-cover shrink-0 bg-kyzz-tertiary"
            style={{ width: '80px', height: '96px' }}
          />
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <p className="text-sm text-kyzz-dark">{product.title}</p>
              <p className="text-[11px] tracking-widest uppercase text-kyzz-muted mt-0.5">
                Talla {product.size}
                {product.colorName && ` · ${product.colorName}`}
                {' '}· x{product.quantity}
              </p>
            </div>
            <p className="text-sm text-kyzz-dark">{currencyFormat(product.price * product.quantity)}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
