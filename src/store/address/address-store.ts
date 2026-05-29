import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface State {
  address: {
    firstName: string;
    lastName: string;
    address: string;
    address2?: string;
    postalCode: string;
    city: string;
    state?: string;
    country: string;
    phone: string;
  };

  // Methods
  setAddress: (address: State["address"]) => void;
}

export const useAddressStore = create<State>()(
  persist(
    (set, get) => ({
      address: {
        firstName: "",
        lastName: "",
        address: "",
        address2: "",
        postalCode: "",
        city: "",
        state: "",
        country: "",
        phone: "",
      },

      setAddress: (address) => {
        set({ address });
      },
    }),
    {
      name: "address-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
