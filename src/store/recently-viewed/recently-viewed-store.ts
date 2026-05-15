import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface RecentlyViewedItem {
  id:    string;
  slug:  string;
  title: string;
  price: number;
  image: string;
}

const MAX_ITEMS = 8;

interface RecentlyViewedState {
  items: RecentlyViewedItem[];
  addItem:    (item: RecentlyViewedItem) => void;
  removeItem: (id: string) => void;
  clear:      () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          // Move to front if already exists, then cap at MAX_ITEMS
          const rest = state.items.filter((i) => i.id !== item.id);
          return { items: [item, ...rest].slice(0, MAX_ITEMS) };
        }),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      clear: () => set({ items: [] }),
    }),
    {
      name:    'kyzz-recently-viewed',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
