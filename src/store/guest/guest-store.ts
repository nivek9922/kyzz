import { create } from "zustand";

interface GuestState {
  guestEmail: string | null;
  setGuestEmail: (email: string) => void;
  clearGuestEmail: () => void;
}

export const useGuestStore = create<GuestState>()((set) => ({
  guestEmail: null,
  setGuestEmail: (email) => set({ guestEmail: email.toLowerCase().trim() }),
  clearGuestEmail: () => set({ guestEmail: null }),
}));
