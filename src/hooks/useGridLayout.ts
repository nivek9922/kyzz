'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Columns } from '@/components/products/product-grid/ProductGrid';

export const GRID_VALID_MOBILE:  Columns[] = [0, 1, 2, 3];
export const GRID_VALID_DESKTOP: Columns[] = [1, 2, 3, 4, 5, 6];
export const GRID_DEFAULT_MOBILE:  Columns = 2;
export const GRID_DEFAULT_DESKTOP: Columns = 3;

interface Options {
  storageKeyMobile:  string;
  storageKeyDesktop: string;
}

export interface GridLayoutState {
  isMobile:     boolean;
  effectiveCols: Columns;
  mounted:      boolean;
  isListView:   boolean;
  gapClass:     string;
  handleChange: (cols: Columns) => void;
}

export function useGridLayout({ storageKeyMobile, storageKeyDesktop }: Options): GridLayoutState {
  const [isMobile, setIsMobile] = useState(false);
  const [columns,  setColumns]  = useState<Columns>(GRID_DEFAULT_DESKTOP);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    setIsMobile(mobile);
    if (mobile) {
      const saved = Number(localStorage.getItem(storageKeyMobile)) as Columns;
      setColumns(GRID_VALID_MOBILE.includes(saved) ? saved : GRID_DEFAULT_MOBILE);
    } else {
      const saved = Number(localStorage.getItem(storageKeyDesktop)) as Columns;
      setColumns(GRID_VALID_DESKTOP.includes(saved) ? saved : GRID_DEFAULT_DESKTOP);
    }
    setMounted(true);
  }, [storageKeyMobile, storageKeyDesktop]);

  const handleChange = useCallback((cols: Columns) => {
    setColumns(cols);
    localStorage.setItem(
      isMobile ? storageKeyMobile : storageKeyDesktop,
      String(cols)
    );
  }, [isMobile, storageKeyMobile, storageKeyDesktop]);

  const effectiveCols: Columns = isMobile
    ? (GRID_VALID_MOBILE.includes(columns) ? columns : GRID_DEFAULT_MOBILE)
    : columns;

  const gapClass = isMobile && effectiveCols === 3 ? 'gap-2'
    : isMobile ? 'gap-3'
    : 'gap-6';

  return {
    isMobile,
    effectiveCols,
    mounted,
    isListView: effectiveCols === 1,
    gapClass,
    handleChange,
  };
}
