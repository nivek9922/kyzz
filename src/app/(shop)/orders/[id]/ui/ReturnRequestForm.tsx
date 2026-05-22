'use client';

import { useState, useTransition } from 'react';
import { IoReturnUpBack } from 'react-icons/io5';
import { toast } from 'sonner';
import { titleFont } from '@/config/fonts';
import { createReturnRequest } from '@/actions/return/create-return-request';
import type { ReturnStatus } from '@prisma/client';

interface Props {
  orderId:       string;
  canRequest:    boolean;  // isPaid && delivered && !cancelledAt
  existingReturn: { status: ReturnStatus; reason: string; createdAt: Date } | null;
}

const STATUS_LABEL: Record<ReturnStatus, string> = {
  PENDING:   'En revisión',
  APPROVED:  'Aprobada',
  REJECTED:  'Rechazada',
  COMPLETED: 'Completada',
};

const STATUS_COLOR: Record<ReturnStatus, string> = {
  PENDING:   'text-amber-600',
  APPROVED:  'text-emerald-600',
  REJECTED:  'text-red-500',
  COMPLETED: 'text-kyzz-primary',
};

export const ReturnRequestForm = ({ orderId, canRequest, existingReturn }: Props) => {
  const [open, setOpen]           = useState(false);
  const [reason, setReason]       = useState('');
  const [details, setDetails]     = useState('');
  const [isPending, startTransition] = useTransition();

  if (existingReturn) {
    return (
      <div className="kyzz-panel p-6">
        <div className="flex items-center gap-2 mb-3">
          <IoReturnUpBack size={16} className="text-kyzz-muted" />
          <p className="text-[11px] tracking-[0.25em] uppercase text-kyzz-muted">Devolución</p>
        </div>
        <p className="text-sm text-kyzz-dark mb-1">{existingReturn.reason}</p>
        <p className={`text-xs font-medium ${STATUS_COLOR[existingReturn.status]}`}>
          {STATUS_LABEL[existingReturn.status]}
        </p>
        <p className="text-xs text-kyzz-muted mt-1">
          Solicitada el {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(existingReturn.createdAt))}
        </p>
      </div>
    );
  }

  if (!canRequest) return null;

  const handleSubmit = () => {
    if (!reason.trim()) { toast.error('Indica el motivo de la devolución'); return; }
    startTransition(async () => {
      const res = await createReturnRequest({ orderId, reason: reason.trim(), details: details.trim() || undefined });
      if (!res.ok) { toast.error(res.message ?? 'Error al enviar solicitud'); return; }
      toast.success('Solicitud enviada. Te contactaremos pronto.');
      setOpen(false);
    });
  };

  return (
    <div className="kyzz-panel p-6">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-dark transition-colors"
        >
          <IoReturnUpBack size={14} />
          Solicitar devolución
        </button>
      ) : (
        <div className="space-y-4">
          <p className={`${titleFont.className} text-base font-normal text-kyzz-dark`}>
            Solicitar devolución
          </p>

          <div className="space-y-1">
            <label className="text-[11px] tracking-widest uppercase text-kyzz-muted">
              Motivo <span className="text-red-400">*</span>
            </label>
            <select
              className="kyzz-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">Selecciona un motivo</option>
              <option value="Talla incorrecta">Talla incorrecta</option>
              <option value="Producto defectuoso">Producto defectuoso</option>
              <option value="No corresponde a la descripción">No corresponde a la descripción</option>
              <option value="Llegó dañado">Llegó dañado</option>
              <option value="Cambio de opinión">Cambio de opinión</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] tracking-widest uppercase text-kyzz-muted">
              Detalles adicionales
            </label>
            <textarea
              rows={3}
              maxLength={1000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe el problema con más detalle (opcional)"
              className="w-full kyzz-input resize-none text-sm"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={isPending || !reason} className="btn-primary">
              {isPending ? 'Enviando...' : 'Enviar solicitud'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-dark transition-colors"
            >
              Cancelar
            </button>
          </div>

          <p className="text-xs text-kyzz-muted leading-relaxed">
            Revisaremos tu solicitud en 1-3 días hábiles y te contactaremos al correo registrado.
          </p>
        </div>
      )}
    </div>
  );
};
