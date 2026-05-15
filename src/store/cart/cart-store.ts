import type { CartProduct } from "@/interfaces";
import { TAX_RATE } from "@/config/constants";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface State {
  cart: CartProduct[];

  getTotalItems: () => number;
  getSummaryInformation: () => {
    subTotal: number;
    tax: number;
    total: number;
    itemsInCart: number;
  };

  addProductTocart: (product: CartProduct) => void;
  updateProductQuantity: (product: CartProduct, quantity: number) => void;
  removeProduct: (product: CartProduct) => void;

  clearCart: () => void;
}

// El matching se hace por variantId (cada combinación talla×color es una variante única).
const sameVariant = (a: CartProduct, b: CartProduct) => a.variantId === b.variantId;

export const useCartStore = create<State>()(
  persist(
    (set, get) => ({
      cart: [],

      getTotalItems: () => {
        const { cart } = get();
        return cart.reduce((total, item) => total + item.quantity, 0);
      },

      getSummaryInformation: () => {
        const { cart } = get();

        const subTotal = cart.reduce(
          (subTotal, product) => product.quantity * product.price + subTotal,
          0
        );
        const tax = subTotal * TAX_RATE;
        const total = subTotal + tax;
        const itemsInCart = cart.reduce(
          (total, item) => total + item.quantity,
          0
        );

        return { subTotal, tax, total, itemsInCart };
      },

      addProductTocart: (product: CartProduct) => {
        const { cart } = get();

        if (!cart.some((item) => sameVariant(item, product))) {
          set({ cart: [...cart, product] });
          return;
        }

        set({
          cart: cart.map((item) =>
            sameVariant(item, product) ? { ...item, quantity: item.quantity + product.quantity } : item
          ),
        });
      },

      updateProductQuantity: (product: CartProduct, quantity: number) => {
        const { cart } = get();
        set({ cart: cart.map((item) => sameVariant(item, product) ? { ...item, quantity } : item) });
      },

      removeProduct: (product: CartProduct) => {
        const { cart } = get();
        set({ cart: cart.filter((item) => !sameVariant(item, product)) });
      },

      clearCart: () => set({ cart: [] }),
    }),

    {
      name: "shopping-cart",
      storage: createJSONStorage(() => localStorage),
      // version 2: matching por variantId (antes era id+size+colorName).
      // Bump → migrate() limpia carritos viejos sin variantId.
      version: 2,
      migrate: (persistedState: unknown) => {
        const state = persistedState as { cart?: CartProduct[] } | undefined;
        if (!state || !Array.isArray(state.cart)) return { cart: [] };
        // Si algún item del carrito viejo no tiene variantId, descartamos todo.
        const allHaveVariant = state.cart.every((i) => typeof i.variantId === 'string' && i.variantId.length > 0);
        return { cart: allHaveVariant ? state.cart : [] };
      },
    }
  )
);
