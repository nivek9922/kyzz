"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { toast } from 'sonner';
import { titleFont } from "@/config/fonts";
import { placeOrder } from "@/actions";
import { useAddressStore, useCartStore } from "@/store";
import { currencyFormat } from "@/utils";
import { useShallow } from "zustand/react/shallow";
import { gaBeginCheckout, gaPurchase } from "@/lib/gtag";

export const PlaceOrder = () => {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const address = useAddressStore((state) => state.address);
  const { cart, clearCart, itemsInCart, subTotal, tax, shipping, total } = useCartStore(
    useShallow((s) => {
      const summary = s.getSummaryInformation();
      return { cart: s.cart, clearCart: s.clearCart, ...summary };
    })
  );

  useEffect(() => {
    setLoaded(true);
    // begin_checkout: el usuario llega al resumen de compra
    gaBeginCheckout({
      value: total,
      items: cart.map(p => ({ id: p.id, name: p.title, price: p.price, quantity: p.quantity })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPlaceOrder = async () => {
    setIsPlacingOrder(true);
    const toastId = toast.loading('Confirmando pedido...');
    const productsToOrder = cart.map((product) => ({
      productId:  product.id,
      variantId:  product.variantId,
      quantity:   product.quantity,
      size:       product.size,
      colorName:  product.colorName,
    }));
    const resp = await placeOrder(productsToOrder, address);
    if (!resp.ok) {
      toast.error('No se pudo confirmar el pedido', {
        id: toastId,
        description: resp.message,
      });
      setIsPlacingOrder(false);
      return;
    }
    toast.success('Pedido confirmado', { id: toastId });
    // purchase: conversión confirmada antes de limpiar el carrito
    gaPurchase({
      orderId: resp.order!.id,
      value:   total,
      tax,
      items:   cart.map(p => ({ id: p.id, name: p.title, price: p.price, quantity: p.quantity })),
    });
    clearCart();
    router.replace("/orders/" + resp.order?.id);
  };

  if (!loaded) {
    return (
      <div className="kyzz-panel animate-pulse space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-3 bg-kyzz-secondary/40 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="kyzz-panel sticky top-24">
      {/* Dirección */}
      <h2 className={`${titleFont.className} text-lg font-normal text-kyzz-dark mb-4`}>
        Dirección de entrega
      </h2>
      <div className="space-y-0.5 text-sm text-kyzz-muted mb-6">
        <p className="text-kyzz-dark">{address.firstName} {address.lastName}</p>
        <p>{address.address}{address.address2 ? `, ${address.address2}` : ""}</p>
        <p>{address.postalCode} {address.city}</p>
        <p>{address.country}</p>
        <p>{address.phone}</p>
      </div>

      <div className="border-t border-kyzz-secondary my-6" />

      {/* Resumen */}
      <h2 className={`${titleFont.className} text-lg font-normal text-kyzz-dark mb-4`}>
        Resumen
      </h2>
      <div className="space-y-3">
        <div className="flex justify-between text-sm text-kyzz-muted">
          <span>Subtotal · {itemsInCart === 1 ? "1 artículo" : `${itemsInCart} artículos`}</span>
          <span>{currencyFormat(subTotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-kyzz-muted">
          <span>Envío</span>
          <span className={shipping === 0 ? 'text-kyzz-dark' : ''}>
            {shipping === 0 ? 'Gratis' : currencyFormat(shipping)}
          </span>
        </div>
        <div className="border-t border-kyzz-secondary pt-4">
          <div className="flex justify-between">
            <span className="text-[11px] tracking-widest uppercase text-kyzz-dark">Total</span>
            <span className="text-sm text-kyzz-dark font-medium">{currencyFormat(total)}</span>
          </div>
          <p className="text-[10px] text-kyzz-muted mt-1">
            Incluye {currencyFormat(tax)} de impuestos
          </p>
        </div>
      </div>

      <p className="text-[10px] text-kyzz-muted mt-6 mb-4 leading-relaxed">
        Al confirmar aceptas nuestros{" "}
        <a href="#" className="underline">términos y condiciones</a>{" "}y{" "}
        <a href="#" className="underline">política de privacidad</a>.
      </p>

      <button
        onClick={onPlaceOrder}
        className={clsx("w-full", {
          "btn-primary": !isPlacingOrder,
          "btn-disabled": isPlacingOrder,
        })}
        disabled={isPlacingOrder}
      >
        {isPlacingOrder ? "Procesando..." : "Confirmar pedido"}
      </button>
    </div>
  );
};
