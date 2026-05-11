'use client';

import { toast } from 'sonner';
import { IoRefreshOutline } from 'react-icons/io5';
import { cancelUnpaidOrders } from '@/actions';

interface Props {
  cancellableCount: number;
}

export const CancelExpiredOrdersButton = ({ cancellableCount }: Props) => {
  if (cancellableCount === 0) return null;

  const handleClick = () => {
    toast(
      `¿Cancelar ${cancellableCount} orden${cancellableCount > 1 ? 'es' : ''} no pagada${cancellableCount > 1 ? 's' : ''}?`,
      {
        description: 'Se restaurará el stock de cada producto. Esta acción no se puede deshacer.',
        duration: 10000,
        action: {
          label: 'Cancelar órdenes',
          onClick: async () => {
            const toastId = toast.loading('Procesando...');
            const { ok, cancelledCount, message } = await cancelUnpaidOrders();
            if (ok) {
              toast.success(
                cancelledCount === 0
                  ? 'No hay órdenes que cancelar'
                  : `${cancelledCount} orden${cancelledCount! > 1 ? 'es canceladas' : ' cancelada'} · Stock restaurado`,
                { id: toastId }
              );
            } else {
              toast.error(message ?? 'Error al procesar', { id: toastId });
            }
          },
        },
        cancel: { label: 'No', onClick: () => {} },
      }
    );
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 text-[11px] tracking-widest uppercase border border-amber-300 text-amber-700 bg-amber-50 px-4 py-2 hover:bg-amber-100 transition-colors"
    >
      <IoRefreshOutline size={13} />
      Cancelar vencidas
      <span className="bg-amber-200 text-amber-800 text-[10px] px-1.5 py-0.5 font-medium">
        {cancellableCount}
      </span>
    </button>
  );
};
