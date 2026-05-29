"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { QuantitySelector, SizeSelector } from "@/components";
import type { CartProduct, Product, Size } from "@/interfaces";
import { useCartStore } from '@/store';
import { gaViewItem, gaAddToCart } from '@/lib/gtag';
import type { VariantData } from './ProductDetailClient';

interface Props {
  product:         Product;
  variants:        VariantData[];                  // variantes ya filtradas al color actual
  availableSizes:  Size[];                         // tallas existentes para este color
  stockBySize:     Partial<Record<Size, number>>;  // stock por talla
  colorName?:      string;
  imageForCart?:   string;                         // primera imagen del color seleccionado
}

export const AddToCart = ({ product, variants, availableSizes, stockBySize, colorName, imageForCart }: Props) => {
  const router = useRouter();
  const addProductToCart = useCartStore((state) => state.addProductTocart);

  const [size, setSize]         = useState<Size | undefined>();
  const [quantity, setQuantity] = useState<number>(1);
  const [posted, setPosted]     = useState(false);

  const availableSizesKey = availableSizes.join('|');

  // ── Reset talla cuando cambia el color (lista de tallas distintas) ──
  useEffect(() => {
    setSize(undefined);
    setQuantity(1);
  }, [availableSizesKey]);

  useEffect(() => {
    gaViewItem({ id: product.id, name: product.title, price: product.price });
  }, [product.id, product.title, product.price]);

  const outOfStockSizes = useMemo(
    () => availableSizes.filter((s) => (stockBySize[s] ?? 0) <= 0),
    [availableSizes, stockBySize]
  );

  // ── Resolver variantId actual ──
  const currentVariant = useMemo(() => {
    if (!size) return null;
    return variants.find((v) => v.size === size) ?? null;
  }, [variants, size]);

  const maxQty = currentVariant ? Math.max(0, currentVariant.stock - currentVariant.reserved) : 0;

  // Si el usuario pide más de lo disponible, recortamos.
  useEffect(() => {
    if (currentVariant && quantity > maxQty) {
      setQuantity(Math.max(1, maxQty));
    }
  }, [currentVariant, maxQty, quantity]);

  const allSoldOut = availableSizes.length > 0 && outOfStockSizes.length === availableSizes.length;
  const noSizesAvailable = availableSizes.length === 0;

  const buildCartProduct = (): CartProduct | null => {
    if (!size || !currentVariant) return null;
    return {
      id:        product.id,
      slug:      product.slug,
      title:     product.title,
      price:     product.price,
      quantity,
      size,
      image:     imageForCart ?? product.images[0] ?? '',
      colorName,
      variantId: currentVariant.id,
    };
  };

  const addToCart = () => {
    setPosted(true);
    if (!size) return;
    if (!currentVariant || maxQty <= 0) {
      toast.error('Esta variante está agotada');
      return;
    }

    const cartProduct = buildCartProduct();
    if (!cartProduct) return;

    addProductToCart(cartProduct);
    gaAddToCart({ id: product.id, name: product.title, price: product.price, size, quantity });
    toast.success('Agregado al carrito', {
      description: `${product.title} — Talla ${size}${colorName ? ` · ${colorName}` : ''}`,
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
    if (!currentVariant || maxQty <= 0) {
      toast.error('Esta variante está agotada');
      return;
    }
    const cartProduct = buildCartProduct();
    if (!cartProduct) return;
    addProductToCart(cartProduct);
    router.push('/checkout/address');
  };

  if (noSizesAvailable) {
    return (
      <p className="text-sm text-kyzz-muted py-3 border border-dashed border-kyzz-secondary text-center">
        Sin variantes disponibles para esta selección.
      </p>
    );
  }

  return (
    <>
      {posted && !size && (
        <p className="text-xs text-red-500 fade-in">Selecciona una talla para continuar</p>
      )}

      <SizeSelector
        selectedSize={size}
        availableSizes={availableSizes}
        outOfStockSizes={outOfStockSizes}
        onSizeChanged={setSize}
      />

      <QuantitySelector
        quantity={quantity}
        onQuantityChanged={(q) => setQuantity(Math.min(q, maxQty || 1))}
      />

      {size && currentVariant && (
        <p className="text-[11px] text-kyzz-muted">
          {maxQty > 0
            ? <>Disponibles: <span className="text-kyzz-dark">{maxQty}</span></>
            : <span className="text-red-500">Talla agotada</span>}
        </p>
      )}

      <div className="flex flex-col gap-2 mt-3">
        <button
          onClick={addToCart}
          disabled={allSoldOut || (size !== undefined && maxQty <= 0)}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {allSoldOut ? 'Producto agotado' : 'Agregar al carrito'}
        </button>
        <button
          onClick={buyNow}
          disabled={allSoldOut || (size !== undefined && maxQty <= 0)}
          className="w-full py-3 text-[11px] tracking-[0.2em] uppercase border border-kyzz-dark text-kyzz-dark hover:bg-kyzz-dark hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Comprar ahora
        </button>
      </div>
    </>
  );
};
