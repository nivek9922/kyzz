'use client';

import { useEffect, useRef } from 'react';
import { gaViewItemList } from '@/lib/gtag';

interface Props {
  listName: string;
  products: { id: string; title: string; price: number }[];
}

/**
 * Dispara view_item_list (GA4) una sola vez al montar, para atribuir desde qué
 * lista descubre la usuaria los productos. No renderiza nada.
 */
export const ViewItemListTracker = ({ listName, products }: Props) => {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || products.length === 0) return;
    fired.current = true;
    gaViewItemList({
      listName,
      items: products.map((p) => ({ id: p.id, name: p.title, price: p.price })),
    });
  }, [listName, products]);

  return null;
};
