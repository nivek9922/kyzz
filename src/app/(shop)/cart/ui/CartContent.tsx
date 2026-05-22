'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IoBagHandleOutline } from 'react-icons/io5';
import { useCartStore } from '@/store';
import { titleFont } from '@/config/fonts';
import { gaViewCart } from '@/lib/gtag';
import { ProductsInCart } from './ProductsInCart';
import { OrderSummary } from './OrderSummary';
import { CartScrollable } from './CartScrollable';

export const CartContent = () => {
  const cart = useCartStore((s) => s.cart);
  const [loaded, setLoaded] = useState(false);
  const viewTracked = useRef(false);
  useEffect(() => { setLoaded(true); }, []);

  // view_cart (GA4) — una vez al ver el carrito con artículos
  useEffect(() => {
    if (!loaded || viewTracked.current || cart.length === 0) return;
    viewTracked.current = true;
    gaViewCart({
      value: cart.reduce((s, p) => s + p.price * p.quantity, 0),
      items: cart.map((p) => ({ id: p.id, name: p.title, price: p.price, quantity: p.quantity })),
    });
  }, [loaded, cart]);

  // Mientras hidrata el store (localStorage): skeleton ligero para evitar
  // el parpadeo del empty state antes de conocer el carrito real.
  if (!loaded) {
    return (
      <div className="space-y-6 py-6">
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

  // ── Estado vacío (inline, consistente con wishlist/órdenes) ──
  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <IoBagHandleOutline size={48} className="text-kyzz-secondary" />
        <p className={`${titleFont.className} text-2xl text-kyzz-dark font-normal`}>
          Tu carrito está vacío
        </p>
        <p className="text-sm text-kyzz-muted max-w-xs leading-relaxed">
          Aún no has añadido ninguna pieza. Explora la colección y encuentra tu próximo básico favorito.
        </p>
        <Link href="/products" className="btn-primary mt-2 inline-block">
          Ver colección
        </Link>
      </div>
    );
  }

  // ── Carrito con productos ──
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-16 items-start">

      {/* Productos */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">
            Artículos
          </p>
          <Link
            href="/"
            className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted hover:text-kyzz-dark transition-colors"
          >
            Continuar comprando
          </Link>
        </div>
        <CartScrollable>
          <ProductsInCart />
        </CartScrollable>
      </div>

      {/* Resumen */}
      <div className="kyzz-panel sticky top-24">
        <h2 className={`${titleFont.className} text-xl font-normal text-kyzz-dark mb-6`}>
          Resumen
        </h2>
        <OrderSummary />
        <div className="mt-8">
          <Link href="/checkout/address" className="btn-primary w-full">
            Finalizar compra
          </Link>
        </div>
      </div>

    </div>
  );
};
