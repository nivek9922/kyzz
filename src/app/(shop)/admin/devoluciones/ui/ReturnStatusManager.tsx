'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateReturnStatus } from '@/actions/return/update-return-status';
import type { ReturnStatus } from '@prisma/client';

interface Props {
  returnId:        string;
  currentStatus:   ReturnStatus;
  adminNotes:      string;
  customerMessage: string;
}

const OPTIONS: { value: ReturnStatus; label: string }[] = [
  { value: 'PENDING',   label: 'En revisión' },
  { value: 'APPROVED',  label: 'Aprobar' },
  { value: 'REJECTED',  label: 'Rechazar' },
  { value: 'COMPLETED', label: 'Completar' },
];

const TEMPLATES: Partial<Record<ReturnStatus, string>> = {
  APPROVED:
    'Tu solicitud fue aprobada. Por favor empaca el producto con sus etiquetas originales y envíalo a: [DIRECCIÓN KYZZ]. Usa Coordinadora o Servientrega. Tienes 5 días hábiles desde hoy. Cuando lo envíes, guarda el número de guía.',
  REJECTED:
    'Revisamos tu solicitud y lamentablemente no podemos procesarla en este momento. [Agrega aquí la razón específica, ej: el producto no cumple los requisitos de devolución / el plazo ya venció / llegó sin etiquetas originales]. Si tienes dudas, escríbenos y con gusto te ayudamos.',
  COMPLETED:
    'Tu devolución ha sido completada exitosamente. [Agrega aquí qué sigue: ej: ya enviamos tu nueva talla con número de guía XXXXXXXXXX / tu reembolso está siendo procesado y llegará en 3-5 días hábiles]. Gracias por tu paciencia.',
};

export const ReturnStatusManager = ({
  returnId,
  currentStatus,
  adminNotes:      initNotes,
  customerMessage: initMessage,
}: Props) => {
  const [status,  setStatus]  = useState<ReturnStatus>(currentStatus);
  const [notes,   setNotes]   = useState(initNotes);
  const [message, setMessage] = useState(initMessage);
  const [open,    setOpen]    = useState(false);
  const [isPending, start]    = useTransition();

  const handleStatusChange = (next: ReturnStatus) => {
    setStatus(next);
    if (!message.trim() && TEMPLATES[next]) {
      setMessage(TEMPLATES[next]!);
    }
  };

  const handleSave = () => {
    start(async () => {
      const res = await updateReturnStatus({
        returnId,
        status,
        adminNotes:      notes   || undefined,
        customerMessage: message || undefined,
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
    <div className="space-y-3 min-w-[220px]">
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value as ReturnStatus)}
        className="kyzz-input text-xs w-full"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <div>
        <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block mb-1">
          Instrucciones para la clienta
          <span className="normal-case tracking-normal ml-1 text-kyzz-muted/70">(se envía en el email)</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Qué debe hacer la clienta (opcional)"
          rows={3}
          maxLength={800}
          className="w-full kyzz-input resize-none text-xs"
        />
      </div>

      <div>
        <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block mb-1">
          Nota interna
          <span className="normal-case tracking-normal ml-1 text-kyzz-muted/70">(solo tú la ves)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Recordatorio privado (opcional)"
          rows={2}
          maxLength={500}
          className="w-full kyzz-input resize-none text-xs"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={isPending} className="btn-primary text-xs py-1.5 px-3">
          {isPending ? '...' : 'Guardar'}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-kyzz-muted hover:text-kyzz-dark transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
};
