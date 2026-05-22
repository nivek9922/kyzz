interface Props {
  createdAt:   Date;
  paidAt:      Date | null;
  shippedAt:   Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
}

const fmt = (d: Date) =>
  new Date(d).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });

/**
 * Timeline de la orden derivado de los timestamps existentes.
 * Si la orden fue cancelada, muestra ese desenlace en lugar de envío/entrega.
 */
export const OrderTimeline = ({ createdAt, paidAt, shippedAt, deliveredAt, cancelledAt }: Props) => {
  const steps: { label: string; at: Date | null; danger?: boolean }[] = cancelledAt
    ? [
        { label: 'Pedido creado', at: createdAt },
        { label: 'Cancelado',     at: cancelledAt, danger: true },
      ]
    : [
        { label: 'Pedido creado',   at: createdAt },
        { label: 'Pago confirmado', at: paidAt },
        { label: 'Enviado',         at: shippedAt },
        { label: 'Entregado',       at: deliveredAt },
      ];

  return (
    <div className="kyzz-panel p-6 mt-6">
      <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-5">Seguimiento</p>
      <ol className="relative">
        {steps.map((step, i) => {
          const done   = !!step.at;
          const isLast = i === steps.length - 1;
          return (
            <li key={step.label} className="flex gap-3 pb-5 last:pb-0 relative">
              {!isLast && (
                <span className={`absolute left-[5px] top-3 bottom-0 w-px ${done ? 'bg-kyzz-primary/40' : 'bg-kyzz-secondary'}`} />
              )}
              <span className={`relative z-10 mt-1 w-[11px] h-[11px] rounded-full shrink-0 border-2 ${
                step.danger
                  ? 'bg-red-500 border-red-500'
                  : done
                    ? 'bg-kyzz-primary border-kyzz-primary'
                    : 'bg-kyzz-neutral border-kyzz-secondary'
              }`} />
              <div className="min-w-0">
                <p className={`text-sm ${done ? (step.danger ? 'text-red-600' : 'text-kyzz-dark') : 'text-kyzz-muted'}`}>
                  {step.label}
                </p>
                <p className="text-[11px] text-kyzz-muted">{step.at ? fmt(step.at) : 'Pendiente'}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
