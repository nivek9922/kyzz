'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { IoStarOutline, IoStar } from 'react-icons/io5';
import { toggleProductFeatured } from '@/actions';

interface Props {
  productId: string;
  isFeatured: boolean;
}

export const ToggleFeaturedButton = ({ productId, isFeatured: initialFeatured }: Props) => {
  const [featured, setFeatured] = useState(initialFeatured);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const next = !featured;
    setFeatured(next); // optimistic update

    const { ok, message } = await toggleProductFeatured(productId);

    if (!ok) {
      setFeatured(!next); // revert
      toast.error(message ?? 'No se pudo actualizar');
    } else {
      toast.success(next ? 'Agregado a Colección Especial' : 'Removido de Colección Especial');
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={featured ? 'Quitar de Colección Especial' : 'Agregar a Colección Especial'}
      className={`hidden md:flex items-center justify-center w-8 h-8 transition-colors ${
        featured
          ? 'text-kyzz-primary hover:text-kyzz-muted'
          : 'text-kyzz-secondary hover:text-kyzz-primary opacity-0 group-hover:opacity-100'
      } ${loading ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {featured ? <IoStar size={14} /> : <IoStarOutline size={14} />}
    </button>
  );
};
