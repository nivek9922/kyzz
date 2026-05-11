import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoTimeOutline } from "react-icons/io5";

interface Props {
  isPaid: boolean;
  cancelledAt?: Date | string | null;
}

export const OrderStatus = ({ isPaid, cancelledAt }: Props) => {
  if (cancelledAt) {
    return (
      <span className="inline-flex items-center gap-2 text-[11px] tracking-widest uppercase text-red-600 bg-red-50 border border-red-200 px-4 py-2">
        <IoCloseCircleOutline size={14} />
        Cancelada
      </span>
    );
  }

  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-2 text-[11px] tracking-widest uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2">
        <IoCheckmarkCircleOutline size={14} />
        Pago confirmado
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-[11px] tracking-widest uppercase text-kyzz-muted bg-kyzz-tertiary border border-kyzz-secondary px-4 py-2">
      <IoTimeOutline size={14} />
      Pendiente de pago
    </span>
  );
};
