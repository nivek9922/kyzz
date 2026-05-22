"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import clsx from 'clsx';
import type { Address, Country } from '@/interfaces';
import { useAddressStore, useCartStore, useGuestStore } from '@/store';
import { deleteUserAddress, setUserAddress } from '@/actions';
import { captureAbandonedCart } from '@/actions/order/capture-abandoned-cart';
import { gaAddShippingInfo } from '@/lib/gtag';
import { useShallow } from 'zustand/react/shallow';

type FormInputs = {
  email?: string;
  firstName: string;
  lastName: string;
  address: string;
  address2?: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  rememberAddress: boolean;
}

interface Props {
  countries: Country[];
  userStoredAddress?: Partial<Address>;
  isGuest?: boolean;
}

export const AddressForm = ({ countries, userStoredAddress = {}, isGuest = false }: Props) => {
  const router = useRouter();
  const { handleSubmit, register, formState: { isValid }, reset } = useForm<FormInputs>({
    defaultValues: { ...(userStoredAddress as any), rememberAddress: false },
  });

  const setAddress    = useAddressStore((state) => state.setAddress);
  const address       = useAddressStore((state) => state.address);
  const setGuestEmail = useGuestStore((state) => state.setGuestEmail);
  const cart          = useCartStore(useShallow((s) => s.cart));

  useEffect(() => {
    if (address.firstName) reset(address as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: FormInputs) => {
    const { rememberAddress, email, ...restAddress } = data;
    setAddress(restAddress);

    if (isGuest && email) {
      setGuestEmail(email);
    } else if (!isGuest) {
      if (rememberAddress) {
        await setUserAddress(restAddress);
      } else {
        await deleteUserAddress();
      }
    }

    gaAddShippingInfo({
      value: cart.reduce((s, p) => s + p.price * p.quantity, 0),
      items: cart.map((p) => ({ id: p.id, name: p.title, price: p.price, quantity: p.quantity })),
    });

    // Captura silenciosa del carrito abandonado (se envía email si no paga en > 3h)
    const cartEmail = isGuest ? data.email : undefined;
    if (cartEmail) {
      void captureAbandonedCart(
        cartEmail,
        cart.map((p) => ({
          id: p.id, title: p.title, price: p.price,
          quantity: p.quantity, size: p.size, slug: p.slug,
          image: p.image, colorName: p.colorName ?? undefined,
          variantId: p.variantId ?? undefined,
        })),
      );
    }

    router.push('/checkout');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">

      {/* Email — solo para invitados */}
      {isGuest && (
        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">
            Correo electrónico
          </label>
          <input
            type="email"
            className="kyzz-input"
            placeholder="para enviarte la confirmación"
            {...register('email', {
              required: true,
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
            })}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Nombres</label>
        <input type="text" className="kyzz-input" {...register('firstName', { required: true })} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Apellidos</label>
        <input type="text" className="kyzz-input" {...register('lastName', { required: true })} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Dirección</label>
        <input type="text" className="kyzz-input" {...register('address', { required: true })} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Dirección 2 (opcional)</label>
        <input type="text" className="kyzz-input" {...register('address2')} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Código postal</label>
        <input type="text" className="kyzz-input" {...register('postalCode', { required: true })} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Ciudad</label>
        <input type="text" className="kyzz-input" {...register('city', { required: true })} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">País</label>
        <select className="kyzz-input cursor-pointer" {...register('country', { required: true })}>
          <option value="">Seleccionar país</option>
          {countries.map((country) => (
            <option key={country.id} value={country.id}>{country.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Teléfono</label>
        <input type="text" className="kyzz-input" {...register('phone', { required: true })} />
      </div>

      <div className="sm:col-span-2 flex flex-col gap-6">
        {!isGuest && (
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              className="w-4 h-4 border border-kyzz-secondary accent-kyzz-primary cursor-pointer"
              id="rememberAddress"
              {...register('rememberAddress')}
            />
            <span className="text-sm text-kyzz-muted group-hover:text-kyzz-dark transition-colors">
              Recordar esta dirección
            </span>
          </label>
        )}

        <button
          disabled={!isValid}
          type="submit"
          className={clsx({ 'btn-primary': isValid, 'btn-disabled': !isValid })}
        >
          Continuar
        </button>
      </div>

    </form>
  );
};
