'use client';

import { toast } from 'sonner';
import { IoTrashOutline } from 'react-icons/io5';
import { deleteProduct } from '@/actions';

interface Props {
  productId: string;
  productTitle: string;
}

export const DeleteProductButton = ({ productId, productTitle }: Props) => {
  const handleClick = () => {
    toast(`¿Eliminar "${productTitle}"?`, {
      description: 'Esta acción no se puede deshacer.',
      duration: 8000,
      action: {
        label: 'Eliminar',
        onClick: async () => {
          const { ok, message } = await deleteProduct(productId);
          if (ok) {
            toast.success('Producto eliminado');
          } else {
            toast.error(message ?? 'No se pudo eliminar');
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
      className="hidden md:flex items-center justify-center w-8 h-8 border border-kyzz-secondary text-kyzz-muted hover:border-red-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
      aria-label="Eliminar producto"
    >
      <IoTrashOutline size={13} />
    </button>
  );
};
