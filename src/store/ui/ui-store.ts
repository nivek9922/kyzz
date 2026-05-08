import { create } from 'zustand';

interface State {
  isMobileMenuOpen: boolean;
  isSearchOpen: boolean;

  openMobileMenu:  () => void;
  closeMobileMenu: () => void;
  openSearch:      () => void;
  closeSearch:     () => void;

  // backward compat (componentes antiguos aún en uso)
  isSideMenuOpen:  boolean;
  openSideMenu:    () => void;
  closeSideMenu:   () => void;
}

export const useUIStore = create<State>()((set) => ({
  isMobileMenuOpen: false,
  isSearchOpen: false,

  openMobileMenu:  () => set({ isMobileMenuOpen: true }),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  openSearch:      () => set({ isSearchOpen: true }),
  closeSearch:     () => set({ isSearchOpen: false }),

  // backward compat
  isSideMenuOpen: false,
  openSideMenu:   () => set({ isMobileMenuOpen: true }),
  closeSideMenu:  () => set({ isMobileMenuOpen: false }),
}));
