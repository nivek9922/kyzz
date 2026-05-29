'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateReturnStatus } from '@/actions/return/update-return-status';
import type { ReturnStatus, ReturnType } from '@prisma/client';

interface Props {
  returnId:        string;
  currentStatus:   ReturnStatus;
  currentReturn:   ReturnType  | null;
  adminNotes:      string;
  customerMessage: string;
  orderTotal:      number;
}

const STATUS_OPTIONS: { value: ReturnStatus; label: string }[] = [
  { value: 'PENDING',   label: 'En revisión' },
  { value: 'APPROVED',  label: 'Aprobar' },
  { value: 'REJECTED',  label: 'Rechazar' },
  { value: 'COMPLETED', label: 'Completar' },
];

const TEMPLATES: Partial<Record<ReturnStatus, string>> = {
  APPROVED:
    'Tu solicitud fue aprobada. Empaca el producto con sus etiquetas originales y envíalo a [DIRECCIÓN KYZZ] usando Coordinadora o Servientrega. Tienes 5 días hábiles. Guarda el número de guía.',
  REJECTED:
    'Revisamos tu solicitud y lamentablemente no podemos procesarla. [Agrega la razón: plazo vencido / producto sin etiquetas / señales de uso / etc.]. Si tienes dudas, escríbenos.',
  COMPLETED:
    'Tu devolución fue completada. [Agrega qué sigue: nueva talla enviada con guía XXXXXXXXXX / reembolso procesado en 3-5 días hábiles]. Gracias por tu paciencia 🤍',
};

export const ReturnStatusManager = ({
  returnId, currentStatus, currentReturn, adminNotes: initNotes,
  customerMessage: initMessage, orderTotal,
}: Props) => {
  const [status,       setStatus]       = useState<ReturnStatus>(currentStatus);
  const [returnType,   setReturnType]   = useState<ReturnType>(currentReturn ?? 'EXCHANGE');
  const [refundAmount, setRefundAmount] = useState<string>(orderTotal.toFixed(0));
  const [refundMethod, setRefundMethod] = useState('');
  const [notes,        setNotes]        = useState(initNotes);
  const [message,      setMessage]      = useState(initMessage);
  const [open,         setOpen]         = useState(false);
  const [isPending,    start]           = useTransition();

  const handleStatusChange = (next: ReturnStatus) => {
    setStatus(next);
    if (!message.trim() && TEMPLATES[next]) setMessage(TEMPLATES[next]!);
  };

  const showResolution = status === 'APPROVED' || status === 'COMPLETED';
  const showRefund     = showResolution && returnType === 'REFUND';

  const handleSave = () => {
    start(async () => {
      const res = await updateReturnStatus({
        returnId,
        status,
        adminNotes:      notes        || undefined,
        customerMessage: message      || undefined,
        returnType:      showResolution ? returnType : undefined,
        refundAmount:    showRefund && refundAmount ? Number(refundAmount) : undefined,
        refundMethod:    showRefund && refundMethod ? refundMethod : undefined,
      });
      if (!res.ok) { toast.error(res.message ?? 'Error'); return; }
      toast.success('Estado actualizado');
      setOpen(false);
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-dark transition-colors"
      >
        Gestionar
      </button>
    );
  }

  return (
    <div className="space-y-3 min-w-[240px]">

      {/* Estado */}
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value as ReturnStatus)}
        className="kyzz-input text-xs w-full"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Tipo de resolución (al aprobar o completar) */}
      {showResolution && (
        <div>
          <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-1.5">Resolución</p>
          <div className="flex gap-2">
            {(['EXCHANGE', 'REFUND'] as ReturnType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setReturnType(t)}
                className={`flex-1 py-1.5 text-[10px] tracking-widest uppercase border transition-colors ${
                  returnType === t
                    ? 'border-kyzz-dark text-kyzz-dark bg-kyzz-tertiary font-medium'
                    : 'border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary'
                }`}
              >
                {t === 'EXCHANGE' ? '↔ Cambio' : '$ Reembolso'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Campos de reembolso */}
      {showRefund && (
        <div className="space-y-2 border-l-2 border-kyzz-secondary pl-3">
          <div>
            <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block mb-1">
              Monto a reembolsar
            </label>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="kyzz-input text-xs w-full"
              placeholder="Ej: 120000"
            />
          </div>
          <div>
            <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block mb-1">
              Método de reembolso
            </label>
            <input
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value)}
              className="kyzz-input text-xs w-full"
              placeholder="Ej: Nequi 3001234567 · Bancolombia TXN-xxx"
            />
          </div>
        </div>
      )}

      {/* Instrucciones para el cliente */}
      <div>
        <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block mb-1">
          Instrucciones para la clienta
          <span className="normal-case tracking-normal ml-1 text-kyzz-muted/70">(se envía en el email)</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={800}
          className="w-full kyzz-input resize-none text-xs"
        />
      </div>

      {/* Nota interna */}
      <div>
        <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block mb-1">
          Nota interna
          <span className="normal-case tracking-normal ml-1 text-kyzz-muted/70">(solo tú la ves)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
          className="w-full kyzz-input resize-none text-xs"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={isPending} className="btn-primary text-xs py-1.5 px-3">
          {isPending ? '…' : 'Guardar'}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-kyzz-muted hover:text-kyzz-dark transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
};
