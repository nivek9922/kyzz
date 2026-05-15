import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface WishlistState {
  items: string[];
  toggle: (id: string) => void;
  has:    (id: string) => boolean;
  clear:  () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      toggle: (id) => {
        const { items } = get();
        set({ items: items.includes(id) ? items.filter((i) => i !== id) : [...items, id] });
      },

      has: (id) => get().items.includes(id),

      clear: () => set({ items: [] }),
    }),
    {
      name: 'kyzz-wishlist',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
