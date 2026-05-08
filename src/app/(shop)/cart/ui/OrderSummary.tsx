"use client";

import { useCartStore } from "@/store";
import { currencyFormat } from "@/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const OrderSummary = () => {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const { itemsInCart, subTotal, tax, total } = useCartStore((state) =>
    state.getSummaryInformation()
  );

  useEffect(() => { setLoaded(true); }, []);

  useEffect(() => {
    if (itemsInCart === 0 && loaded) router.replace('/empty');
  }, [itemsInCart, loaded, router]);

  if (!loaded) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-3 w-24 bg-kyzz-secondary/40" />
            <div className="h-3 w-16 bg-kyzz-secondary/40" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-kyzz-muted">
        <span>Productos</span>
        <span>{itemsInCart === 1 ? '1 artículo' : `${itemsInCart} artículos`}</span>
      </div>
      <div className="flex justify-between text-sm text-kyzz-muted">
        <span>Subtotal</span>
        <span>{currencyFormat(subTotal)}</span>
      </div>
      <div className="flex justify-between text-sm text-kyzz-muted">
        <span>Impuestos (15%)</span>
        <span>{currencyFormat(tax)}</span>
      </div>
      <div className="border-t border-kyzz-secondary pt-4 mt-2">
        <div className="flex justify-between">
          <span className="text-sm tracking-widest uppercase text-kyzz-dark">Total</span>
          <span className="text-sm text-kyzz-dark font-medium">{currencyFormat(total)}</span>
        </div>
      </div>
    </div>
  );
};
