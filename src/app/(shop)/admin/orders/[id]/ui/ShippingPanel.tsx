'use client';

import { useState } from 'react';
import { ShippingStatus } from '@prisma/client';
import { toast } from 'sonner';
import { IoLockClosedOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import { updateOrderShipping, confirmCodOrder } from '@/actions';

const REQUIRES_PAYMENT: ShippingStatus[] = ['processing', 'shipped', 'delivered'];

const STATUS_OPTIONS: { value: ShippingStatus; label: string; color: string }[] = [
  { value: 'pending',    label: 'Pendiente',  color: 'text-kyzz-muted bg-kyzz-tertiary border-kyzz-secondary' },
  { value: 'processing', label: 'Procesando', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'shipped',    label: 'Enviado',    color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'delivered',  label: 'Entregado',  color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { value: 'returned',   label: 'Devuelto',   color: 'text-red-600 bg-red-50 border-red-200' },
];

interface Props {
  orderId:         string;
  currentStatus:   ShippingStatus;
  currentTracking: string | null;
  currentNotes:    string | null;
  isPaid:          boolean;
  isCancelled:     boolean;
  paymentMethod:   'prepaid' | 'cod';
  codConfirmed:    boolean;
}

export const ShippingPanel = ({
  orderId, currentStatus, currentTracking, currentNotes, isPaid, isCancelled,
  paymentMethod, codConfirmed,
}: Props) => {
  const [status,   setStatus]   = useState<ShippingStatus>(currentStatus);
  const [tracking, setTracking] = useState(currentTracking ?? '');
  const [notes,    setNotes]    = useState(currentNotes ?? '');
  const [saving,   setSaving]   = useState(false);
  const [confirming, setConfirming] = useState(false);

  const isCod = paymentMethod === 'cod';
  // COD avanza sin pago previo (se cobra al entregar); prepaid exige pago confirmado.
  const canAdvance = isPaid || isCod;

  const handleConfirmCod = async () => {
    setConfirming(true);
    const id = toast.loading('Confirmando pedido...');
    const result = await confirmCodOrder(orderId);
    if (result.ok) {
      toast.success('Pedido confirmado', { id });
      setStatus('processing');
    } else {
      toast.error(result.message ?? 'Error', { id });
    }
    setConfirming(false);
  };

  const handleSave = async () => {
    if (REQUIRES_PAYMENT.includes(status) && !canAdvance) {
      toast.error('El pedido debe estar pagado para avanzar a este estado.');
      return;
    }
    setSaving(true);
    const id = toast.loading('Actualizando estado...');
    const result = await updateOrderShipping({
      orderId,
      shippingStatus: status,
      trackingCode:   tracking || undefined,
      shippingNotes:  notes    || undefined,
    });
    if (result.ok) {
      toast.success('Estado actualizado', { id });
    } else {
      toast.error(result.message ?? 'Error', { id });
    }
    setSaving(false);
  };

  if (isCancelled) {
    return (
      <div className="kyzz-panel p-6">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-3">Control de envío</p>
        <p className="text-sm text-red-500">Este pedido fue cancelado.</p>
      </div>
    );
  }

  return (
    <div className="kyzz-panel p-6 space-y-6">
      <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted">Control de envío</p>

      {/* COD: confirmación anti-fraude antes de despachar */}
      {isCod && !codConfirmed && (
        <div className="bg-kyzz-tertiary border border-kyzz-secondary px-3 py-3 space-y-2">
          <p className="text-[11px] text-kyzz-dark leading-relaxed">
            Pedido <strong>contraentrega</strong> sin confirmar. Confírmalo (tras validar por WhatsApp)
            para detener la expiración de la reserva y prepararlo para envío.
          </p>
          <button
            onClick={handleConfirmCod}
            disabled={confirming}
            className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase border border-kyzz-dark text-kyzz-dark px-3 py-1.5 hover:bg-kyzz-dark hover:text-white transition-colors disabled:opacity-50"
          >
            <IoCheckmarkCircleOutline size={14} />
            {confirming ? 'Confirmando…' : 'Confirmar pedido'}
          </button>
        </div>
      )}

      {/* Aviso prepaid sin pagar */}
      {!isCod && !isPaid && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-3 py-2.5">
          <IoLockClosedOutline className="text-amber-600 mt-0.5 shrink-0" size={14} />
          <p className="text-[11px] text-amber-700 leading-relaxed">
            El pedido <strong>no ha sido pagado</strong>. Solo puedes marcarlo como Pendiente o Devuelto hasta confirmar el pago.
          </p>
        </div>
      )}

      {/* Aviso COD: cobro al entregar */}
      {isCod && (
        <p className="text-[11px] text-kyzz-muted leading-relaxed">
          Contraentrega: al marcar <strong>Entregado</strong> se registra el cobro en efectivo automáticamente.
        </p>
      )}

      {/* Botones de estado */}
      <div>
        <p className="text-[11px] tracking-widest uppercase text-kyzz-muted mb-3">Estado</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(opt => {
            const locked = !canAdvance && REQUIRES_PAYMENT.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => !locked && setStatus(opt.value)}
                title={locked ? 'Requiere pago confirmado' : undefined}
                className={`px-3 py-1.5 text-[10px] tracking-widest uppercase border transition-all ${
                  locked
                    ? 'opacity-35 cursor-not-allowed text-kyzz-muted border-kyzz-secondary'
                    : status === opt.value
                      ? opt.color + ' font-medium'
                      : 'text-kyzz-muted border-kyzz-secondary hover:border-kyzz-primary hover:text-kyzz-primary'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Código de rastreo */}
      <div>
        <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-2">
          Código de rastreo
        </label>
        <input
          className="kyzz-input text-sm"
          placeholder="Ej: TCC-987654321"
          value={tracking}
          onChange={e => setTracking(e.target.value)}
          disabled={!canAdvance}
        />
      </div>

      {/* Notas internas */}
      <div>
        <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-2">
          Notas internas
        </label>
        <textarea
          className="kyzz-input text-sm resize-none"
          rows={3}
          placeholder="Notas de logística, observaciones de entrega..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full"
      >
        {saving ? 'Guardando...' : 'Actualizar estado'}
      </button>
    </div>
  );
};
