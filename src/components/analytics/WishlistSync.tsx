'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useWishlistStore } from '@/store';
import { getWishlistIds, addManyWishlist } from '@/actions/wishlist/wishlist-db';

/**
 * Sincroniza la wishlist local (localStorage) con la BD según la sesión:
 *  - Al loguearse: une local + remoto y sube los IDs solo-locales.
 *  - Al desloguearse: limpia el local para no mezclarlo con otra usuaria.
 * No renderiza nada.
 */
export const WishlistSync = () => {
  const { status }    = useSession();
  const setAuthed     = useWishlistStore((s) => s.setAuthed);
  const hydrateFromDb = useWishlistStore((s) => s.hydrateFromDb);
  const clear         = useWishlistStore((s) => s.clear);
  const synced        = useRef(false);
  const prevStatus    = useRef(status);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      if (prevStatus.current === 'authenticated') clear(); // logout en este dispositivo
      setAuthed(false);
      synced.current = false;
      prevStatus.current = status;
      return;
    }

    // authenticated — sincroniza una sola vez por sesión
    prevStatus.current = status;
    if (synced.current) return;
    synced.current = true;

    (async () => {
      const remote    = await getWishlistIds();
      const localOnly = hydrateFromDb(remote);
      if (localOnly.length > 0) await addManyWishlist(localOnly);
    })();
  }, [status, setAuthed, hydrateFromDb, clear]);

  return null;
};
