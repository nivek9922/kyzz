'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { IoArrowUndoOutline } from 'react-icons/io5';
import { createReturnRequestAdmin } from '@/actions';
import type { ReturnType } from '@prisma/client';

interface Props {
  orderId: string;
}

const REASONS = [
  'Talla incorrecta',
  'Producto defectuoso',
  'No corresponde a la descripción',
  'Llegó dañado',
  'Cambio de opinión',
  'Otro',
];

export const AdminReturnButton = ({ orderId }: Props) => {
  const router = useRouter();
  const [open,       setOpen]       = useState(false);
  const [reason,     setReason]     = useState(REASONS[0]);
  const [details,    setDetails]    = useState('');
  const [returnType, setReturnType] = useState<ReturnType>('EXCHANGE');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    const id = toast.loading('Registrando devolución...');
    const res = await createReturnRequestAdmin({ orderId, reason, details: details || undefined, returnType });
    if (!res.ok) {
      toast.error(res.message ?? 'Error', { id });
      setSubmitting(false);
      return;
    }
    toast.success('Devolución registrada', { id });
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase border border-kyzz-secondary text-kyzz-muted px-3 py-1.5 hover:border-kyzz-dark hover:text-kyzz-dark transition-colors"
      >
        <IoArrowUndoOutline size={13} />
        Registrar devolución
      </button>
    );
  }

  return (
    <div className="border border-kyzz-secondary p-4 space-y-4 bg-kyzz-tertiary">
      <p className="text-[10px] tracking-widest uppercase text-kyzz-muted">Registrar devolución</p>

      {/* Motivo */}
      <div>
        <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-1.5">Motivo</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="kyzz-input text-sm w-full"
        >
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Tipo de resolución */}
      <div>
        <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-1.5">Resolución esperada</label>
        <div className="flex gap-2">
          {(['EXCHANGE', 'REFUND'] as ReturnType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setReturnType(t)}
              className={`flex-1 py-1.5 text-[10px] tracking-widest uppercase border transition-colors ${
                returnType === t
                  ? 'border-kyzz-dark text-kyzz-dark bg-white font-medium'
                  : 'border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary'
              }`}
            >
              {t === 'EXCHANGE' ? '↔ Cambio' : '$ Reembolso'}
            </button>
          ))}
        </div>
      </div>

      {/* Detalles */}
      <div>
        <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-1.5">
          Detalles <span className="normal-case tracking-normal text-kyzz-muted/60">(opcional)</span>
        </label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Ej: la clienta envió foto del defecto por WhatsApp"
          className="kyzz-input text-sm resize-none w-full"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">
          {submitting ? 'Registrando…' : 'Confirmar'}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={submitting}
          className="px-4 py-2 text-[10px] tracking-widest uppercase border border-kyzz-secondary text-kyzz-muted hover:border-kyzz-dark hover:text-kyzz-dark transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
