"use client";

import { useCartStore } from "@/store";
import { currencyFormat } from "@/utils";
import { useShallow } from "zustand/react/shallow";
import { FreeShippingBar } from "@/components";

// Solo se monta desde CartContent cuando el carrito ya está hidratado y tiene
// ítems, por eso no necesita guard de carga ni manejar el estado vacío.
export const OrderSummary = () => {
  const { itemsInCart, subTotal, tax, shipping, total } = useCartStore(
    useShallow((state) => state.getSummaryInformation())
  );

  return (
    <div className="space-y-3">
      <FreeShippingBar subTotal={subTotal} />
      <div className="flex justify-between text-sm text-kyzz-muted">
        <span>Subtotal · {itemsInCart === 1 ? '1 artículo' : `${itemsInCart} artículos`}</span>
        <span>{currencyFormat(subTotal)}</span>
      </div>
      <div className="flex justify-between text-sm text-kyzz-muted">
        <span>Envío</span>
        <span className={shipping === 0 ? 'text-kyzz-dark' : ''}>
          {shipping === 0 ? 'Gratis' : currencyFormat(shipping)}
        </span>
      </div>
      <div className="border-t border-kyzz-secondary pt-4 mt-2">
        <div className="flex justify-between">
          <span className="text-sm tracking-widest uppercase text-kyzz-dark">Total</span>
          <span className="text-sm text-kyzz-dark font-medium">{currencyFormat(total)}</span>
        </div>
        <p className="text-[10px] text-kyzz-muted mt-1">
          Incluye {currencyFormat(tax)} de impuestos
        </p>
      </div>
    </div>
  );
};
