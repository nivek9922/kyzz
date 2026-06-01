'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  IoCheckmarkCircleOutline, IoCloseCircleOutline, IoTimeOutline,
  IoSearchOutline, IoRocketOutline, IoCheckmarkDoneOutline,
  IoAlertCircleOutline, IoLockClosedOutline, IoArrowForwardOutline,
} from 'react-icons/io5';
import { updateReturnStatus } from '@/actions/return/update-return-status';
import type { ReturnStatus, ReturnType, PostSaleType, ShippingResponsibility, RefundStatus, ItemCondition } from '@prisma/client';

interface Props {
  returnId:        string;
  status:          ReturnStatus;
  requestType:     PostSaleType | null;
  returnType:      ReturnType | null;
  whoPayShipping:  ShippingResponsibility | null;
  expiresAt:       Date | null;
  adminNotes:      string;
  customerMessage: string;
  orderTotal:      number;
  refundAmount:    number | null;
  refundMethod:    string;
  refundStatus:    RefundStatus | null;
  itemCondition:   ItemCondition | null;
}

const CONDITION_OPTS: { value: ItemCondition; label: string }[] = [
  { value: 'PERFECT',        label: 'Perfecto — sin uso, etiquetas intactas' },
  { value: 'ACCEPTABLE',     label: 'Aceptable — marcas mínimas, vendible' },
  { value: 'USED',           label: 'Usado — señales de uso evidentes' },
  { value: 'DAMAGED',        label: 'Dañado — daño que justifica rechazo' },
  { value: 'DEFECTIVE_CONF', label: 'Defecto de fábrica confirmado' },
  { value: 'INCOMPLETE',     label: 'Incompleto — falta componente' },
];

const TEMPLATES: Partial<Record<ReturnStatus, string>> = {
  EVIDENCE_REQUIRED:
    'Para continuar con tu solicitud necesitamos fotos claras del producto. Por favor envíalas respondiendo este email o por WhatsApp en las próximas 48 horas.',
  APPROVED:
    'Tu solicitud fue aprobada. Empaca el producto con sus etiquetas originales. Tienes 5 días hábiles para enviarlo. Guarda el número de guía.',
  GUIDE_SENT:
    'Te enviamos la guía de devolución. Úsala para enviar el producto por [TRANSPORTADORA]. El envío está pagado por KYZZ. Guarda el comprobante.',
  REJECTED:
    'Revisamos tu solicitud y lamentablemente no podemos procesarla en este momento. Si tienes dudas, escríbenos.',
  REJECTED_AFTER_INSPECT:
    'Recibimos el producto y tras inspección no podemos procesar el cambio/devolución por las condiciones en que llegó. Te contactaremos para coordinar la devolución del artículo.',
  COMPLETED:
    'Tu solicitud ha sido completada. Gracias por tu paciencia.',
};

export function ReturnFlowManager({
  returnId, status, requestType, returnType: initReturnType,
  whoPayShipping, expiresAt, adminNotes: initNotes,
  customerMessage: initMessage, orderTotal, refundAmount: initRefund,
  refundMethod: initRefundMethod, refundStatus, itemCondition,
}: Props) {
  const router  = useRouter();
  const [busy, setBusy] = useState(false);

  // Form state
  const [notes,            setNotes]            = useState(initNotes);
  const [message,          setMessage]          = useState(initMessage);
  const [returnType,       setReturnType]        = useState<ReturnType>(initReturnType ?? 'REFUND');
  const [refundAmt,        setRefundAmt]         = useState(String(initRefund ?? orderTotal));
  const [refundMethod,     setRefundMethod]      = useState(initRefundMethod);
  const [trackingCode,     setTrackingCode]      = useState('');
  const [carrier,          setCarrier]           = useState('');
  const [condition,        setCondition]         = useState<ItemCondition>(itemCondition ?? 'PERFECT');
  const [conditionNotes,   setConditionNotes]    = useState('');
  const [rejectionReason,  setRejectionReason]   = useState('');

  const run = async (
    nextStatus: ReturnStatus,
    extra: Record<string, unknown> = {},
    loadingMsg = 'Actualizando...',
  ) => {
    setBusy(true);
    const id = toast.loading(loadingMsg);
    try {
      const res = await updateReturnStatus({
        returnId,
        status: nextStatus,
        adminNotes:      notes      || undefined,
        customerMessage: message    || undefined,
        returnType:      returnType ?? undefined,
        refundAmount:    refundAmt  ? Number(refundAmt) : undefined,
        refundMethod:    refundMethod || undefined,
        ...extra,
      });
      if (res.ok) {
        toast.success('Estado actualizado', { id });
        router.refresh();
      } else {
        toast.error(res.message ?? 'Error', { id });
      }
    } catch {
      toast.error('Error inesperado', { id });
    } finally {
      setBusy(false);
    }
  };

  const setTemplate = (s: ReturnStatus) => {
    if (!message.trim() && TEMPLATES[s]) setMessage(TEMPLATES[s]!);
  };

  const isExpired = expiresAt && expiresAt < new Date();

  // ── COMPLETADA / CERRADA ────────────────────────────────────────────────────
  if (['COMPLETED', 'CLOSED'].includes(status)) {
    return (
      <div className="kyzz-panel px-5 py-5 space-y-3">
        <div className="flex gap-3 items-start">
          <IoCheckmarkDoneOutline size={16} className="text-emerald-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-kyzz-dark">
              {status === 'COMPLETED' ? 'Solicitud completada' : 'Solicitud cerrada'}
            </p>
            <p className="text-[11px] text-kyzz-muted mt-1 leading-relaxed">
              {status === 'COMPLETED' ? 'El proceso terminó exitosamente.' : 'La solicitud fue archivada.'}
            </p>
          </div>
        </div>
        <OverridePanel returnId={returnId} busy={busy} run={run} setTemplate={setTemplate}
          notes={notes} setNotes={setNotes} message={message} setMessage={setMessage} />
      </div>
    );
  }

  // ── RECHAZADAS ──────────────────────────────────────────────────────────────
  if (['REJECTED', 'REJECTED_AFTER_INSPECT'].includes(status)) {
    return (
      <div className="kyzz-panel px-5 py-5 space-y-3">
        <div className="flex gap-3 items-start">
          <IoCloseCircleOutline size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-kyzz-dark">Solicitud rechazada</p>
            <p className="text-[11px] text-kyzz-muted mt-1 leading-relaxed">
              {status === 'REJECTED_AFTER_INSPECT'
                ? 'Rechazada tras inspección física. Producto marcado como dañado en inventario.'
                : 'La solicitud fue rechazada antes de recibir el producto.'}
            </p>
          </div>
        </div>
        <OverridePanel returnId={returnId} busy={busy} run={run} setTemplate={setTemplate}
          notes={notes} setNotes={setNotes} message={message} setMessage={setMessage} />
      </div>
    );
  }

  return (
    <div className="kyzz-panel overflow-hidden divide-y divide-kyzz-secondary">
      {/* Cabecera */}
      <div className="px-5 py-4">
        <p className="text-[9px] tracking-[0.3em] uppercase text-kyzz-muted">Gestión de solicitud</p>
        <p className="text-xs text-kyzz-dark mt-1">
          {['PENDING','EVIDENCE_REQUIRED'].includes(status) && 'Decide si aprobar, rechazar o pedir evidencia.'}
          {status === 'APPROVED' && 'Configura el envío de regreso y envía instrucciones.'}
          {status === 'GUIDE_SENT' && 'Esperando que la clienta use la guía de regreso.'}
          {status === 'IN_TRANSIT' && 'El producto está en camino. Confirma cuando llegue.'}
          {status === 'RECEIVED' && 'Producto en bodega. Inicia la inspección.'}
          {status === 'INSPECTING' && 'Documenta la condición física del producto.'}
          {['ACCEPTED','PROCESSING'].includes(status) && 'Define la resolución (reembolso o cambio).'}
        </p>
        {isExpired && (
          <p className="text-[10px] text-red-500 mt-2">Plazo de devolución vencido — necesita override del admin.</p>
        )}
      </div>

      {/* ── PASO 1: PENDING / EVIDENCE_REQUIRED ─────────────────────── */}
      {['PENDING', 'EVIDENCE_REQUIRED'].includes(status) && (
        <div className="px-5 py-5 space-y-4">
          {status === 'EVIDENCE_REQUIRED' && (
            <div className="flex gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
              <IoTimeOutline size={13} className="mt-0.5 shrink-0" />
              Esperando evidencia fotográfica de la clienta.
            </div>
          )}

          <CommonFields
            notes={notes} setNotes={setNotes}
            message={message} setMessage={setMessage}
            placeholder="Escribe instrucciones o comentarios para la clienta..."
          />

          <div className="space-y-2 pt-2 border-t border-kyzz-secondary">
            {status === 'PENDING' && (
              <button onClick={() => { setTemplate('EVIDENCE_REQUIRED'); run('EVIDENCE_REQUIRED', {}, 'Solicitando evidencia...'); }}
                disabled={busy}
                className="w-full py-2.5 text-[10px] tracking-widest uppercase border border-amber-400 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50">
                <IoAlertCircleOutline className="inline mr-2" size={13} />
                Solicitar evidencia fotográfica
              </button>
            )}
            <button onClick={() => { setTemplate('APPROVED'); run('APPROVED', {}, 'Aprobando...'); }}
              disabled={busy}
              className="btn-primary w-full py-2.5 text-[10px] tracking-widests disabled:opacity-50">
              <IoCheckmarkCircleOutline className="inline mr-2" size={13} />
              Aprobar solicitud
            </button>
            <button onClick={() => { setTemplate('REJECTED'); run('REJECTED', { rejectionReason: rejectionReason || undefined }, 'Rechazando...'); }}
              disabled={busy}
              className="w-full py-2.5 text-[10px] tracking-widest uppercase border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
              <IoCloseCircleOutline className="inline mr-2" size={13} />
              Rechazar solicitud
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 2: APPROVED — configurar envío de regreso ──────────── */}
      {status === 'APPROVED' && (
        <div className="px-5 py-5 space-y-4">
          {whoPayShipping && (
            <div className={`flex gap-2 text-[11px] px-3 py-2 border ${
              whoPayShipping === 'KYZZ'
                ? 'text-blue-700 bg-blue-50 border-blue-200'
                : 'text-kyzz-muted bg-kyzz-tertiary border-kyzz-secondary'
            }`}>
              <IoLockClosedOutline size={13} className="mt-0.5 shrink-0" />
              {whoPayShipping === 'KYZZ'
                ? 'KYZZ paga el flete de regreso. Genera la guía y pégala aquí.'
                : 'La clienta paga el flete. Proporciónale la dirección de bodega KYZZ.'}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block">Guía de regreso (si la generas tú)</label>
            <input value={trackingCode} onChange={e => setTrackingCode(e.target.value)}
              className="kyzz-input text-sm w-full" placeholder="Número de guía (opcional)" />
            <input value={carrier} onChange={e => setCarrier(e.target.value)}
              className="kyzz-input text-sm w-full" placeholder="Transportadora (Coordinadora, Servientrega...)" />
          </div>

          <CommonFields notes={notes} setNotes={setNotes} message={message} setMessage={setMessage}
            placeholder={TEMPLATES.APPROVED} />

          <div className="space-y-2 pt-2 border-t border-kyzz-secondary">
            {trackingCode.trim() ? (
              <button onClick={() => { setTemplate('GUIDE_SENT');
                run('GUIDE_SENT', { returnTrackingCode: trackingCode, returnCarrier: carrier || undefined }, 'Enviando guía...'); }}
                disabled={busy}
                className="btn-primary w-full py-2.5 text-[10px] tracking-widest disabled:opacity-50">
                <IoRocketOutline className="inline mr-2" size={13} />
                Guardar guía y notificar clienta
              </button>
            ) : (
              <button onClick={() => run('IN_TRANSIT', {}, 'Actualizando...')}
                disabled={busy}
                className="btn-primary w-full py-2.5 text-[10px] tracking-widest disabled:opacity-50">
                <IoArrowForwardOutline className="inline mr-2" size={13} />
                La clienta ya envió — marcar en tránsito
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── PASO 3: GUIDE_SENT / IN_TRANSIT — confirmar recepción ───── */}
      {['GUIDE_SENT', 'IN_TRANSIT'].includes(status) && (
        <div className="px-5 py-5 space-y-4">
          <div className="flex gap-3">
            <IoTimeOutline size={16} className="text-sky-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-kyzz-dark">
                {status === 'GUIDE_SENT' ? 'Guía enviada — esperando el envío' : 'En camino a KYZZ'}
              </p>
              <p className="text-[11px] text-kyzz-muted mt-0.5 leading-relaxed">
                Cuando el paquete llegue físicamente a la bodega, confirma la recepción.
                Esto mueve las unidades a cuarentena automáticamente.
              </p>
            </div>
          </div>

          {status === 'GUIDE_SENT' && (
            <div className="space-y-1">
              <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block">
                Guía de regreso del cliente (si la proporciona)
              </label>
              <input value={trackingCode} onChange={e => setTrackingCode(e.target.value)}
                className="kyzz-input text-sm w-full" placeholder="Número de guía" />
            </div>
          )}

          <CommonFields notes={notes} setNotes={setNotes} message={message} setMessage={setMessage}
            placeholder="Nota interna de recepción..." />

          <button onClick={() => run('RECEIVED',
              trackingCode ? { returnTrackingCode: trackingCode } : {},
              'Confirmando recepción...')}
            disabled={busy}
            className="btn-primary w-full py-2.5 text-[10px] tracking-widest disabled:opacity-50">
            <IoCheckmarkCircleOutline className="inline mr-2" size={13} />
            Confirmar recepción en bodega
          </button>
        </div>
      )}

      {/* ── PASO 4: RECEIVED — iniciar inspección ───────────────────── */}
      {status === 'RECEIVED' && (
        <div className="px-5 py-5 space-y-4">
          <div className="flex gap-3">
            <IoSearchOutline size={16} className="text-violet-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-kyzz-dark">Producto en bodega</p>
              <p className="text-[11px] text-kyzz-muted mt-0.5">
                Inicia la inspección física cuando tengas el producto en mano.
              </p>
            </div>
          </div>
          <CommonFields notes={notes} setNotes={setNotes} message={message} setMessage={setMessage}
            placeholder="Notas de recepción..." />
          <button onClick={() => run('INSPECTING', {}, 'Iniciando inspección...')}
            disabled={busy}
            className="btn-primary w-full py-2.5 text-[10px] tracking-widest disabled:opacity-50">
            <IoSearchOutline className="inline mr-2" size={13} />
            Iniciar inspección física
          </button>
        </div>
      )}

      {/* ── PASO 5: INSPECTING — documentar condición ───────────────── */}
      {status === 'INSPECTING' && (
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block mb-2">
              Condición del producto
            </label>
            <div className="space-y-1.5">
              {CONDITION_OPTS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setCondition(opt.value)}
                  className={`w-full text-left px-3 py-2 text-[11px] border transition-colors ${
                    condition === opt.value
                      ? 'border-kyzz-dark bg-kyzz-tertiary text-kyzz-dark'
                      : 'border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block mb-1">
              Notas de inspección (internas)
            </label>
            <textarea value={conditionNotes} onChange={e => setConditionNotes(e.target.value)}
              rows={2} className="kyzz-input text-sm w-full resize-none"
              placeholder="Describe lo que observas..." />
          </div>

          <CommonFields notes={notes} setNotes={setNotes} message={message} setMessage={setMessage}
            placeholder={TEMPLATES.REJECTED_AFTER_INSPECT} />

          <div className="space-y-2 pt-2 border-t border-kyzz-secondary">
            <button onClick={() => run('ACCEPTED', { itemCondition: condition, conditionNotes: conditionNotes || undefined }, 'Aceptando...')}
              disabled={busy}
              className="btn-primary w-full py-2.5 text-[10px] tracking-widest disabled:opacity-50">
              <IoCheckmarkCircleOutline className="inline mr-2" size={13} />
              Producto OK — Aceptar y restockear
            </button>
            <button onClick={() => { setTemplate('REJECTED_AFTER_INSPECT');
              run('REJECTED_AFTER_INSPECT', { itemCondition: condition, conditionNotes: conditionNotes || undefined, rejectionReason: conditionNotes || undefined }, 'Rechazando...'); }}
              disabled={busy}
              className="w-full py-2.5 text-[10px] tracking-widest uppercase border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
              <IoCloseCircleOutline className="inline mr-2" size={13} />
              Rechazar — Producto dañado / usado
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 6: ACCEPTED / PROCESSING — resolución ──────────────── */}
      {['ACCEPTED', 'PROCESSING'].includes(status) && (
        <div className="px-5 py-5 space-y-4">
          <div className="flex gap-3">
            <IoCheckmarkCircleOutline size={16} className="text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-kyzz-dark">Inspección aprobada</p>
              <p className="text-[11px] text-kyzz-muted mt-0.5">Define y ejecuta la resolución.</p>
            </div>
          </div>

          <div>
            <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block mb-2">Tipo de resolución</label>
            <div className="flex gap-2">
              {(['EXCHANGE', 'REFUND'] as ReturnType[]).map((t) => (
                <button key={t} type="button" onClick={() => setReturnType(t)}
                  className={`flex-1 py-2 text-[10px] tracking-widest uppercase border transition-colors ${
                    returnType === t ? 'border-kyzz-dark bg-kyzz-tertiary text-kyzz-dark' : 'border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary'
                  }`}>
                  {t === 'EXCHANGE' ? '↔ Cambio' : '$ Reembolso'}
                </button>
              ))}
            </div>
          </div>

          {returnType === 'REFUND' && (
            <div className="space-y-2 border-l-2 border-kyzz-secondary pl-3">
              <div>
                <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block mb-1">Monto</label>
                <input type="number" value={refundAmt} onChange={e => setRefundAmt(e.target.value)}
                  className="kyzz-input text-sm w-full" />
              </div>
              <div>
                <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block mb-1">Método</label>
                <input value={refundMethod} onChange={e => setRefundMethod(e.target.value)}
                  className="kyzz-input text-sm w-full" placeholder="Nequi 300... · Bancolombia..." />
              </div>
            </div>
          )}

          {returnType === 'EXCHANGE' && (
            <div className="text-[11px] text-kyzz-muted bg-kyzz-tertiary border border-kyzz-secondary px-3 py-2.5">
              Para cambio de talla/producto, crea el nuevo pedido desde{' '}
              <Link href="/admin/orders/nuevo" className="underline hover:text-kyzz-primary">Pedido WhatsApp</Link>{' '}
              y anota aquí el número de la nueva orden.
            </div>
          )}

          <CommonFields notes={notes} setNotes={setNotes} message={message} setMessage={setMessage}
            placeholder={TEMPLATES.COMPLETED} />

          <button onClick={() => { setTemplate('COMPLETED'); run('COMPLETED', {}, 'Completando...'); }}
            disabled={busy}
            className="btn-primary w-full py-2.5 text-[10px] tracking-widest disabled:opacity-50">
            <IoCheckmarkDoneOutline className="inline mr-2" size={13} />
            Marcar como completado
          </button>
        </div>
      )}

      {/* Corrección manual (siempre al fondo) */}
      <OverridePanel returnId={returnId} busy={busy} run={run} setTemplate={setTemplate}
        notes={notes} setNotes={setNotes} message={message} setMessage={setMessage} />
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function CommonFields({
  notes, setNotes, message, setMessage, placeholder,
}: {
  notes: string; setNotes: (v: string) => void;
  message: string; setMessage: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block mb-1">
          Mensaje para la clienta <span className="normal-case tracking-normal text-kyzz-muted/70">(se envía por email)</span>
        </label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
          maxLength={800} className="kyzz-input text-sm w-full resize-none"
          placeholder={placeholder ?? 'Escribe un mensaje para la clienta...'} />
      </div>
      <div>
        <label className="text-[10px] tracking-widest uppercase text-kyzz-muted block mb-1">
          Nota interna <span className="normal-case tracking-normal text-kyzz-muted/70">(solo admin)</span>
        </label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          maxLength={500} className="kyzz-input text-sm w-full resize-none"
          placeholder="Nota interna..." />
      </div>
    </div>
  );
}

const ALL_STATUSES = [
  { value: 'PENDING',               label: 'Pendiente' },
  { value: 'EVIDENCE_REQUIRED',     label: 'Pedir evidencia' },
  { value: 'APPROVED',              label: 'Aprobada' },
  { value: 'GUIDE_SENT',            label: 'Guía enviada' },
  { value: 'IN_TRANSIT',            label: 'En tránsito' },
  { value: 'RECEIVED',              label: 'Recibida' },
  { value: 'INSPECTING',            label: 'En inspección' },
  { value: 'ACCEPTED',              label: 'Aceptada' },
  { value: 'PROCESSING',            label: 'Procesando' },
  { value: 'COMPLETED',             label: 'Completada' },
  { value: 'REJECTED',              label: 'Rechazada' },
  { value: 'REJECTED_AFTER_INSPECT','label': 'Rechazada (inspección)' },
  { value: 'CLOSED',                label: 'Cerrada' },
] as const;

function OverridePanel({
  returnId, busy, run, setTemplate, notes, setNotes, message, setMessage,
}: {
  returnId: string; busy: boolean;
  run: (s: ReturnStatus, extra?: Record<string, unknown>, msg?: string) => void;
  setTemplate: (s: ReturnStatus) => void;
  notes: string; setNotes: (v: string) => void;
  message: string; setMessage: (v: string) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [override, setOverride] = useState<ReturnStatus>('PENDING');

  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3 text-left text-[9px] tracking-widest uppercase text-kyzz-muted hover:bg-kyzz-tertiary transition-colors">
        Corregir estado manualmente ▾
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-kyzz-secondary">
          <p className="text-[11px] text-kyzz-muted pt-3">Solo si algo salió del flujo normal.</p>
          <select value={override} onChange={e => setOverride(e.target.value as ReturnStatus)}
            className="kyzz-input text-sm w-full">
            {ALL_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <CommonFields notes={notes} setNotes={setNotes} message={message} setMessage={setMessage} />
          <button onClick={() => { setTemplate(override); run(override, {}, 'Actualizando...'); setOpen(false); }}
            disabled={busy}
            className="btn-primary w-full py-2 text-[10px] tracking-widest disabled:opacity-50">
            Actualizar estado
          </button>
        </div>
      )}
    </div>
  );
}
