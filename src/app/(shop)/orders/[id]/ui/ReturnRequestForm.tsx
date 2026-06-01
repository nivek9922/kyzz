'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { IoReturnUpBack, IoArrowForwardOutline } from 'react-icons/io5';
import { toast } from 'sonner';
import { titleFont } from '@/config/fonts';
import { createReturnRequest } from '@/actions/return/create-return-request';
import type { ReturnStatus, PostSaleType } from '@prisma/client';

interface Props {
  orderId:       string;
  canRequest:    boolean;
  existingReturn: {
    id:        string;
    status:    ReturnStatus;
    reason:    string;
    createdAt: Date;
    rmaCode?:  string | null;
  } | null;
}

const STATUS_LABEL: Partial<Record<ReturnStatus, string>> = {
  PENDING:               'En revisión',
  EVIDENCE_REQUIRED:     'Pendiente de evidencia',
  APPROVED:              'Aprobada',
  GUIDE_SENT:            'Guía de regreso enviada',
  IN_TRANSIT:            'En camino a KYZZ',
  RECEIVED:              'Recibida en bodega',
  INSPECTING:            'En inspección',
  ACCEPTED:              'Aceptada — procesando',
  PROCESSING:            'Procesando',
  COMPLETED:             'Completada',
  REJECTED:              'Rechazada',
  REJECTED_AFTER_INSPECT:'Rechazada tras inspección',
  CLOSED:                'Cerrada',
};

const STATUS_COLOR: Partial<Record<ReturnStatus, string>> = {
  PENDING:               'text-amber-600',
  EVIDENCE_REQUIRED:     'text-amber-600',
  APPROVED:              'text-blue-600',
  GUIDE_SENT:            'text-blue-600',
  IN_TRANSIT:            'text-sky-600',
  RECEIVED:              'text-sky-600',
  INSPECTING:            'text-violet-600',
  ACCEPTED:              'text-emerald-600',
  PROCESSING:            'text-emerald-600',
  COMPLETED:             'text-kyzz-primary',
  REJECTED:              'text-red-500',
  REJECTED_AFTER_INSPECT:'text-red-500',
  CLOSED:                'text-kyzz-muted',
};

// Motivo de la clienta → tipo de solicitud que se enviará al sistema
const REASON_TYPE_MAP: Record<string, PostSaleType> = {
  'Talla incorrecta':              'SIZE_EXCHANGE',
  'Quiero cambiar a otro producto':'PRODUCT_EXCHANGE',
  'Producto defectuoso':           'DEFECTIVE',
  'Llegó dañado':                  'DEFECTIVE',
  'No corresponde a la descripción':'DEFECTIVE',
  'Garantía — defecto tras el uso':'WARRANTY',
  'KYZZ envió el producto incorrecto':'KYZZ_ERROR',
  'Cambio de opinión':             'RETURN',
  'Otro':                          'RETURN',
};

const REASON_OPTIONS = Object.keys(REASON_TYPE_MAP);

export const ReturnRequestForm = ({ orderId, canRequest, existingReturn }: Props) => {
  const [open, setOpen]     = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [rmaCode, setRmaCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (existingReturn) {
    const needsAction = ['EVIDENCE_REQUIRED', 'APPROVED', 'GUIDE_SENT'].includes(existingReturn.status);
    return (
      <div className="kyzz-panel p-6 space-y-3">
        <div className="flex items-center gap-2">
          <IoReturnUpBack size={16} className="text-kyzz-muted" />
          <p className="text-[11px] tracking-[0.25em] uppercase text-kyzz-muted">
            Devolución {existingReturn.rmaCode ? `· ${existingReturn.rmaCode}` : ''}
          </p>
        </div>
        <p className="text-sm text-kyzz-dark">{existingReturn.reason}</p>
        <p className={`text-xs font-medium ${STATUS_COLOR[existingReturn.status] ?? 'text-kyzz-muted'}`}>
          {STATUS_LABEL[existingReturn.status] ?? existingReturn.status}
        </p>
        <p className="text-xs text-kyzz-muted">
          Solicitada el {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(existingReturn.createdAt))}
        </p>
        <Link
          href={`/devoluciones/${existingReturn.id}`}
          className={`inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase transition-colors ${
            needsAction ? 'text-amber-700 hover:text-amber-900' : 'text-kyzz-muted hover:text-kyzz-primary'
          }`}
        >
          {needsAction ? 'Acción requerida' : 'Ver detalle'}
          <IoArrowForwardOutline size={11} />
        </Link>
      </div>
    );
  }

  // Confirmación tras enviar exitosamente
  if (rmaCode) {
    return (
      <div className="kyzz-panel p-6 space-y-3">
        <div className="flex items-center gap-2">
          <IoReturnUpBack size={16} className="text-emerald-500" />
          <p className="text-[11px] tracking-[0.25em] uppercase text-kyzz-muted">Solicitud enviada</p>
        </div>
        <p className="text-sm text-kyzz-dark">
          Tu solicitud fue recibida. Revisaremos en 1–3 días hábiles.
        </p>
        <p className="text-xs text-kyzz-muted font-mono">Código: {rmaCode}</p>
        <Link href={`/devoluciones`} className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors">
          Ver mis devoluciones <IoArrowForwardOutline size={11} />
        </Link>
      </div>
    );
  }

  if (!canRequest) return null;

  const handleSubmit = () => {
    if (!reason.trim()) { toast.error('Indica el motivo'); return; }
    const requestType = REASON_TYPE_MAP[reason] ?? 'RETURN';
    startTransition(async () => {
      const res = await createReturnRequest({
        orderId,
        reason: reason.trim(),
        details: details.trim() || undefined,
        requestType,
      });
      if (!res.ok) { toast.error(res.message ?? 'Error al enviar solicitud'); return; }
      setRmaCode(res.rmaCode ?? null);
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
          Solicitar devolución / cambio
        </button>
      ) : (
        <div className="space-y-4">
          <p className={`${titleFont.className} text-base font-normal text-kyzz-dark`}>
            Solicitar devolución / cambio
          </p>

          <div className="space-y-1">
            <label className="text-[11px] tracking-widest uppercase text-kyzz-muted">
              Motivo <span className="text-red-400">*</span>
            </label>
            <select className="kyzz-input w-full" value={reason} onChange={e => setReason(e.target.value)}>
              <option value="">Selecciona el motivo</option>
              {REASON_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {reason && REASON_TYPE_MAP[reason] !== 'RETURN' && (
              <p className="text-[10px] text-kyzz-muted">
                {({
                  SIZE_EXCHANGE:    'Cambio de talla — enviaremos la talla correcta cuando recibamos la tuya.',
                  PRODUCT_EXCHANGE: 'Cambio de producto — coordinaremos el intercambio contigo.',
                  DEFECTIVE:        'Defectuoso — KYZZ cubre el envío de regreso.',
                  WARRANTY:         'Garantía — aplica para defectos de fabricación.',
                  KYZZ_ERROR:       'Error nuestro — cubrimos todo el proceso sin costo para ti.',
                  RETURN:           '',
                } as Record<string, string>)[REASON_TYPE_MAP[reason]] ?? ''}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] tracking-widest uppercase text-kyzz-muted">
              Detalles adicionales
            </label>
            <textarea rows={3} maxLength={1000} value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Describe el problema con detalle (opcional)"
              className="w-full kyzz-input resize-none text-sm" />
          </div>

          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={isPending || !reason} className="btn-primary disabled:opacity-50">
              {isPending ? 'Enviando...' : 'Enviar solicitud'}
            </button>
            <button onClick={() => setOpen(false)}
              className="text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-dark transition-colors">
              Cancelar
            </button>
          </div>

          <p className="text-xs text-kyzz-muted leading-relaxed">
            Revisaremos tu solicitud en 1–3 días hábiles y te contactaremos al correo registrado.
          </p>
        </div>
      )}
    </div>
  );
};
