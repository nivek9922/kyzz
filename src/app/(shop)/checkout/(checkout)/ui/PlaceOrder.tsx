"use client";

import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { toast } from 'sonner';
import { titleFont } from "@/config/fonts";
import { placeOrder } from "@/actions";
import { captureAbandonedCart } from "@/actions/order/capture-abandoned-cart";
import { useAddressStore, useCartStore, useCouponStore, useGuestStore } from "@/store";
import { useSession } from 'next-auth/react';
import { currencyFormat } from "@/utils";
import { useShallow } from "zustand/react/shallow";
import { gaBeginCheckout, gaPurchase } from "@/lib/gtag";
import { CouponInput } from "./CouponInput";

type PaymentChoice = 'prepaid' | 'cod';

export const PlaceOrder = () => {
  const router = useRouter();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod]   = useState<PaymentChoice>('prepaid');

  const { data: session } = useSession();
  const address = useAddressStore((state) => state.address);
  const { cart, clearCart, itemsInCart, subTotal, tax, shipping } = useCartStore(
    useShallow((s) => {
      const summary = s.getSummaryInformation();
      return { cart: s.cart, clearCart: s.clearCart, ...summary };
    })
  );

  const { coupon, removeCoupon } = useCouponStore(
    useShallow((s) => ({ coupon: s.coupon, removeCoupon: s.removeCoupon }))
  );

  const { guestEmail, clearGuestEmail } = useGuestStore(
    useShallow((s) => ({ guestEmail: s.guestEmail, clearGuestEmail: s.clearGuestEmail }))
  );

  const couponDiscount = coupon?.discount ?? 0;
  const total = subTotal + shipping - couponDiscount;

  // Captura el carrito para recuperación por email si el usuario abandona sin comprar.
  // El cron de las 2am envía el email de recuperación después de 3h de inactividad.
  const effectiveEmail = session?.user?.email ?? guestEmail;
  useEffect(() => {
    if (!effectiveEmail || cart.length === 0) return;
    captureAbandonedCart(effectiveEmail, cart.map((p) => ({
      id:        p.id,
      slug:      p.slug,
      title:     p.title,
      price:     p.price,
      quantity:  p.quantity,
      size:      p.size,
      image:     p.image,
      colorName: p.colorName,
      variantId: p.variantId,
    })));
  // Solo necesitamos disparar esto una vez al entrar al checkout.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveEmail]);

  useEffect(() => {
    if (cart.length === 0) return;
    gaBeginCheckout({
      value: total,
      items: cart.map(p => ({ id: p.id, name: p.title, price: p.price, quantity: p.quantity })),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length]);

  const onPlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Tu carrito está vacío', { description: 'Agrega productos antes de confirmar' });
      return;
    }
    if (!address.firstName || !address.address || !address.city || !address.country) {
      toast.error('Falta tu dirección de entrega', { description: 'Completa todos los campos requeridos' });
      router.push('/checkout/address');
      return;
    }

    setIsPlacingOrder(true);
    const toastId = toast.loading('Confirmando pedido...');

    const productsToOrder = cart.map((product) => ({
      productId:  product.id,
      variantId:  product.variantId,
      quantity:   product.quantity,
      size:       product.size,
      colorName:  product.colorName,
    }));

    const resp = await placeOrder(productsToOrder, address, coupon?.code, guestEmail ?? undefined, paymentMethod);

    if (!resp.ok) {
      toast.error('No se pudo confirmar el pedido', { id: toastId, description: resp.message });
      setIsPlacingOrder(false);
      return;
    }

    toast.success(
      paymentMethod === 'cod' ? 'Pedido recibido' : 'Pedido confirmado',
      { id: toastId, description: paymentMethod === 'cod' ? 'Te contactaremos para confirmar tu pedido.' : undefined },
    );
    gaPurchase({
      orderId: resp.order!.id,
      value:   total,
      tax,
      items:   cart.map(p => ({ id: p.id, name: p.title, price: p.price, quantity: p.quantity })),
    });
    clearCart();
    removeCoupon();
    clearGuestEmail();
    router.replace("/orders/" + resp.order?.id);
  };

  return (
    <div className="kyzz-panel md:sticky md:top-24">
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

        {/* Descuento de cupón */}
        {couponDiscount > 0 && coupon && (
          <div className="flex justify-between text-sm text-kyzz-primary">
            <span>Descuento ({coupon.code})</span>
            <span>−{currencyFormat(couponDiscount)}</span>
          </div>
        )}

        <div className="border-t border-kyzz-secondary pt-4">
          <div className="flex justify-between">
            <span className="text-[11px] tracking-widest uppercase text-kyzz-dark">Total</span>
            <span className="text-sm text-kyzz-dark font-medium">{currencyFormat(total)}</span>
          </div>
          <p className="text-[10px] text-kyzz-muted mt-1">Incluye {currencyFormat(tax)} de impuestos</p>
        </div>
      </div>

      {/* Cupón */}
      <div className="border-t border-kyzz-secondary mt-5 pt-4">
        <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-3">
          Código de descuento
        </p>
        <CouponInput subtotal={subTotal} />
      </div>

      {/* Método de pago */}
      <div className="border-t border-kyzz-secondary mt-5 pt-4">
        <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted mb-3">
          Método de pago
        </p>
        <div className="space-y-2">
          {([
            { value: 'prepaid', title: 'Pago en línea', desc: 'Tarjeta, PSE, Nequi, Bancolombia · Wompi' },
            { value: 'cod',     title: 'Contraentrega',  desc: 'Paga al recibir tu pedido' },
          ] as const).map((opt) => {
            const active = paymentMethod === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPaymentMethod(opt.value)}
                className={clsx(
                  'w-full text-left border p-3 transition-colors flex items-start gap-3',
                  active ? 'border-kyzz-dark bg-kyzz-tertiary' : 'border-kyzz-secondary hover:border-kyzz-muted',
                )}
              >
                <span className={clsx(
                  'mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 transition-colors',
                  active ? 'border-kyzz-dark bg-kyzz-dark' : 'border-kyzz-secondary',
                )} />
                <span>
                  <span className="block text-sm text-kyzz-dark">{opt.title}</span>
                  <span className="block text-[11px] text-kyzz-muted mt-0.5">{opt.desc}</span>
                </span>
              </button>
            );
          })}
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
          "btn-primary":  !isPlacingOrder,
          "btn-disabled": isPlacingOrder,
        })}
        disabled={isPlacingOrder}
      >
        {isPlacingOrder ? "Procesando..." : "Confirmar pedido"}
      </button>
    </div>
  );
};
