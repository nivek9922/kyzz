"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { QuantitySelector, SizeSelector } from "@/components";
import type { CartProduct, Product, Size } from "@/interfaces";
import { useCartStore } from '@/store';

interface Props {
  product: Product;
}

export const AddToCart = ({ product }: Props) => {
  const router = useRouter();
  const addProductToCart = useCartStore((state) => state.addProductTocart);

  const [size, setSize]         = useState<Size | undefined>();
  const [quantity, setQuantity] = useState<number>(1);
  const [posted, setPosted]     = useState(false);

  const buildCartProduct = (): CartProduct => ({
    id:       product.id,
    slug:     product.slug,
    title:    product.title,
    price:    product.price,
    quantity,
    size:     size!,
    image:    product.images[0],
  });

  const addToCart = () => {
    setPosted(true);
    if (!size) return;

    addProductToCart(buildCartProduct());
    toast.success('Agregado al carrito', {
      description: `${product.title} — Talla ${size}`,
      action: {
        label: 'Ver carrito',
        onClick: () => router.push('/cart'),
      },
    });
    setPosted(false);
    setQuantity(1);
    setSize(undefined);
  };

  const buyNow = () => {
    setPosted(true);
    if (!size) return;

    addProductToCart(buildCartProduct());
    router.push('/checkout/address');
  };

  return (
    <>
      {posted && !size && (
        <p className="text-xs text-red-500 fade-in">Selecciona una talla para continuar</p>
      )}

      <SizeSelector
        selectedSize={size}
        availableSizes={product.sizes}
        onSizeChanged={setSize}
      />

      <QuantitySelector quantity={quantity} onQuantityChanged={setQuantity} />

      <div className="flex flex-col gap-2 my-5">
        <button onClick={addToCart} className="btn-primary">
          Agregar al carrito
        </button>
        <button
          onClick={buyNow}
          className="w-full py-3 text-[11px] tracking-[0.2em] uppercase border border-kyzz-dark text-kyzz-dark hover:bg-kyzz-dark hover:text-white transition-colors"
        >
          Comprar ahora
        </button>
      </div>
    </>
  );
};
