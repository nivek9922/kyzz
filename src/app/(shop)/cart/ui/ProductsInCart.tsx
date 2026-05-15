'use client';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/store';
import { ProductImage, QuantitySelector } from '@/components';
import Link from 'next/link';

export const ProductsInCart = () => {
  const updateProductQuantity = useCartStore((state) => state.updateProductQuantity);
  const removeProduct = useCartStore((state) => state.removeProduct);
  const [loaded, setLoaded] = useState(false);
  const productsInCart = useCartStore((state) => state.cart);

  useEffect(() => { setLoaded(true); }, []);

  if (!loaded) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-5 animate-pulse">
            <div className="w-24 h-28 bg-kyzz-secondary/40 shrink-0" />
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
        <div key={product.variantId} className="flex gap-5 py-6">
          <ProductImage
            src={product.image}
            width={96}
            height={112}
            alt={product.title}
            className="object-cover shrink-0 bg-kyzz-tertiary"
            style={{ width: '96px', height: '112px' }}
          />
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <Link
                href={`/product/${product.slug}`}
                className="text-sm text-kyzz-dark hover:text-kyzz-primary transition-colors"
              >
                {product.title}
              </Link>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] tracking-widest uppercase text-kyzz-muted">
                  Talla {product.size}
                </p>
                {product.colorName && (
                  <p className="text-[11px] tracking-widest uppercase text-kyzz-muted">
                    · {product.colorName}
                  </p>
                )}
              </div>
              <p className="text-sm text-kyzz-dark mt-1">${product.price.toFixed(2)}</p>
            </div>
            <div className="flex items-center justify-between mt-3">
              <QuantitySelector
                quantity={product.quantity}
                onQuantityChanged={(quantity) => updateProductQuantity(product, quantity)}
              />
              <button
                onClick={() => removeProduct(product)}
                className="text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-dark transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
