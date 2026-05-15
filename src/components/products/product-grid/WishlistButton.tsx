'use client';

import { useEffect, useState } from 'react';
import { IoHeart, IoHeartOutline } from 'react-icons/io5';
import { useWishlistStore } from '@/store';

interface Props {
  productId: string;
}

export const WishlistButton = ({ productId }: Props) => {
  const toggle     = useWishlistStore((s) => s.toggle);
  const items      = useWishlistStore((s) => s.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const inWishlist = items.includes(productId);

  return (
    <button
      type="button"
      aria-label={inWishlist ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
    >
      {inWishlist
        ? <IoHeart      size={16} className="text-kyzz-dark" />
        : <IoHeartOutline size={16} className="text-kyzz-dark" />
      }
    </button>
  );
};
