'use client';
import { useCartStore } from '@/store';
import { ProductImage, QuantitySelector } from '@/components';
import { gaRemoveFromCart } from '@/lib/gtag';
import Link from 'next/link';

// El estado de carga/vacío lo gestiona CartContent; aquí solo se listan los ítems.
export const ProductsInCart = () => {
  const updateProductQuantity = useCartStore((state) => state.updateProductQuantity);
  const removeProduct = useCartStore((state) => state.removeProduct);
  const productsInCart = useCartStore((state) => state.cart);

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
                onClick={() => {
                  gaRemoveFromCart({
                    id: product.id, name: product.title, price: product.price,
                    size: product.size, quantity: product.quantity,
                  });
                  removeProduct(product);
                }}
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
