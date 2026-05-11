'use client';

import { toast } from 'sonner';
import { IoCheckmarkOutline } from 'react-icons/io5';
import { markOrderAsPaid } from '@/actions';

interface Props {
  orderId: string;
}

export const MarkOrderPaidButton = ({ orderId }: Props) => {
  const handleClick = () => {
    toast('¿Marcar pedido como pagado?', {
      description: 'Se registrará como pago manual. Esta acción no se puede revertir.',
      duration: 8000,
      action: {
        label: 'Confirmar',
        onClick: async () => {
          const { ok, message } = await markOrderAsPaid(orderId);
          if (ok) {
            toast.success('Pedido marcado como pagado');
          } else {
            toast.error(message ?? 'Error al actualizar el pedido');
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
    });
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-kyzz-primary border border-kyzz-primary px-3 py-1 hover:bg-kyzz-primary hover:text-white transition-colors"
    >
      <IoCheckmarkOutline size={11} />
      Pago manual
    </button>
  );
};
