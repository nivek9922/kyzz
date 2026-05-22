import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setWishlistItem } from '@/actions/wishlist/wishlist-db';

interface WishlistState {
  items:  string[];
  authed: boolean;
  toggle: (id: string) => void;
  has:    (id: string) => boolean;
  clear:  () => void;
  setAuthed:     (v: boolean) => void;
  /** Une el wishlist local con el remoto (BD) y devuelve los IDs solo-locales a subir. */
  hydrateFromDb: (remoteIds: string[]) => string[];
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items:  [],
      authed: false,

      toggle: (id) => {
        const { items, authed } = get();
        const adding = !items.includes(id);
        set({ items: adding ? [...items, id] : items.filter((i) => i !== id) });
        // Si hay sesión, persiste el cambio en BD (optimista, fire-and-forget).
        if (authed) void setWishlistItem(id, adding);
      },

      has: (id) => get().items.includes(id),

      clear: () => set({ items: [] }),

      setAuthed: (v) => set({ authed: v }),

      hydrateFromDb: (remoteIds) => {
        const { items } = get();
        const union = Array.from(new Set([...items, ...remoteIds]));
        set({ items: union, authed: true });
        return items.filter((id) => !remoteIds.includes(id));
      },
    }),
    {
      name: 'kyzz-wishlist',
      storage: createJSONStorage(() => localStorage),
      // 'authed' es derivado de la sesión: no se persiste, lo fija WishlistSync.
      partialize: (state) => ({ items: state.items }),
    }
  )
);
