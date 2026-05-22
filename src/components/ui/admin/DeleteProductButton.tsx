'use client';

import { toast } from 'sonner';
import { IoArchiveOutline } from 'react-icons/io5';
import { toggleProductArchived } from '@/actions';

interface Props {
  productId:    string;
  productTitle: string;
}

export const DeleteProductButton = ({ productId, productTitle }: Props) => {
  const handleClick = () => {
    toast('Archivar producto', {
      description: `"${productTitle}" — Dejará de aparecer en la tienda. Puedes restaurarlo en Productos → Archivados.`,
      duration: 8000,
      action: {
        label: 'Archivar',
        onClick: async () => {
          const { ok, message } = await toggleProductArchived(productId);
          if (ok) {
            toast.success('Producto archivado');
          } else {
            toast.error(message ?? 'No se pudo archivar');
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {},
      },
    });
  };

  return (
    <button
      onClick={handleClick}
      title="Archivar producto"
      className="hidden md:flex items-center justify-center w-8 h-8 border border-kyzz-secondary text-kyzz-muted hover:border-amber-300 hover:text-amber-500 transition-colors opacity-0 group-hover:opacity-100"
      aria-label="Archivar producto"
    >
      <IoArchiveOutline size={13} />
    </button>
  );
};
