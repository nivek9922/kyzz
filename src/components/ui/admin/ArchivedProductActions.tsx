'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { IoRefreshOutline, IoTrashOutline } from 'react-icons/io5';
import { toggleProductArchived, deleteProduct } from '@/actions';

interface Props {
  productId:    string;
  productTitle: string;
}

export const ArchivedProductActions = ({ productId, productTitle }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleRestore = async () => {
    setLoading(true);
    const { ok, message } = await toggleProductArchived(productId);
    if (!ok) toast.error(message ?? 'No se pudo restaurar');
    else toast.success('Producto restaurado y visible en tienda');
    setLoading(false);
  };

  const handlePermanentDelete = () => {
    toast('Eliminar definitivamente', {
      description: `"${productTitle}" — Esta acción no se puede deshacer. Solo es posible si el producto no tiene pedidos.`,
      duration: 10000,
      action: {
        label: 'Confirmar',
        onClick: async () => {
          const { ok, message } = await deleteProduct(productId);
          if (ok) toast.success('Producto eliminado permanentemente');
          else toast.error(message ?? 'No se pudo eliminar');
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
    });
  };

  return (
    <>
      {/* Restaurar — siempre visible en vista archivados */}
      <button
        onClick={handleRestore}
        disabled={loading}
        title="Restaurar producto"
        className={`hidden md:flex items-center justify-center w-8 h-8 border border-kyzz-secondary text-emerald-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors ${
          loading ? 'opacity-40 cursor-not-allowed' : ''
        }`}
      >
        <IoRefreshOutline size={13} />
      </button>

      {/* Eliminar definitivo — visible en hover; la action rechaza si tiene pedidos */}
      <button
        onClick={handlePermanentDelete}
        disabled={loading}
        title="Eliminar definitivamente"
        className="hidden md:flex items-center justify-center w-8 h-8 border border-kyzz-secondary text-kyzz-muted hover:border-red-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Eliminar permanentemente"
      >
        <IoTrashOutline size={13} />
      </button>
    </>
  );
};
