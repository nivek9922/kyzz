'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Carrier, ShippingStatus } from '@prisma/client';
import {
  IoCheckmarkCircleOutline, IoRocketOutline, IoCheckmarkDoneOutline,
  IoTimeOutline, IoOpenOutline, IoImageOutline, IoCloseOutline,
  IoLockClosedOutline, IoChevronDownOutline,
} from 'react-icons/io5';
import {
  confirmCodOrder, updateOrderShipping,
  upsertShipment, markOrderAsPaid, uploadProofImage,
} from '@/actions';
import { CARRIER_OPTIONS, carrierTrackingUrl } from '@/lib/shipping/carriers';

interface Props {
  orderId:         string;
  channel:         string;
  paymentMethod:   'prepaid' | 'cod';
  isPaid:          boolean;
  isCancelled:     boolean;
  codConfirmed:    boolean;
  shippingStatus:  ShippingStatus;
  currentCarrier:  Carrier | null;
  currentTracking: string | null;
  currentCost:     number | null;
  currentNotes:    string | null;
}

const CHANNEL_LABEL: Record<string, string> = {
  web: 'Web', whatsapp: 'WhatsApp', instagram: 'Instagram', other: 'Otro',
};

export const ShippingManager = ({
  orderId, channel, paymentMethod, isPaid, isCancelled,
  codConfirmed, shippingStatus,
  currentCarrier, currentTracking, currentCost, currentNotes,
}: Props) => {
  const router = useRouter();

  const [carrier,       setCarrier]       = useState<Carrier>(currentCarrier ?? 'manual');
  const [tracking,      setTracking]      = useState(currentTracking ?? '');
  const [cost,          setCost]          = useState(currentCost != null ? String(currentCost) : '');
  const [savingGuide,   setSavingGuide]   = useState(false);
  const [localIsPaid,   setLocalIsPaid]   = useState(isPaid);
  const [showPaidForm,  setShowPaidForm]  = useState(false);
  const [payRef,        setPayRef]        = useState('');
  const [proofFile,     setProofFile]     = useState<File | null>(null);
  const [proofPreview,  setProofPreview]  = useState<string | null>(null);
  const [submittingPay, setSubmittingPay] = useState(false);
  const [busy,          setBusy]          = useState(false);
  const [showOverride,  setShowOverride]  = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<ShippingStatus>(shippingStatus);
  const [notes,         setNotes]         = useState(currentNotes ?? '');
  const [savingOverride, setSavingOverride] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCod      = paymentMethod === 'cod';
  const isManualCh = channel !== 'web';
  const hasGuide   = Boolean(currentTracking);
  const trackUrl   = carrierTrackingUrl(currentCarrier, currentTracking);
  const canAdvance = localIsPaid || isCod;

  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>, msg: string) => {
    setBusy(true);
    const id = toast.loading(msg);
    try {
      const res = await fn();
      if (res.ok) { toast.success('Listo', { id }); router.refresh(); }
      else        { toast.error(res.message ?? 'Error', { id }); }
    } catch {
      toast.error('Error inesperado', { id });
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10MB'); return; }
    setProofFile(file);
    setProofPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
  }, []);

  const clearFile = useCallback(() => {
    setProofFile(null);
    setProofPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleConfirmPay = async () => {
    setSubmittingPay(true);
    const tid = toast.loading('Registrando pago...');
    let proofUrl: string | undefined;
    if (proofFile) {
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res((r.result as string).split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(proofFile);
      });
      const up = await uploadProofImage(b64, proofFile.type);
      if (!up.ok) { toast.error(up.message ?? 'Error', { id: tid }); setSubmittingPay(false); return; }
      proofUrl = up.url;
    }
    const result = await markOrderAsPaid(orderId, payRef.trim() || undefined, proofUrl);
    if (result.ok) { toast.success('Pago registrado', { id: tid }); setLocalIsPaid(true); setShowPaidForm(false); router.refresh(); }
    else           { toast.error(result.message ?? 'Error', { id: tid }); }
    setSubmittingPay(false);
  };

  const handleSaveGuide = async () => {
    setSavingGuide(true);
    const id = toast.loading('Guardando guía...');
    const res = await upsertShipment({
      orderId, carrier,
      trackingCode: tracking.trim() || undefined,
      cost: cost.trim() ? Number(cost) : undefined,
    });
    if (res.ok) { toast.success('Guía guardada', { id }); router.refresh(); }
    else        { toast.error(res.message ?? 'Error', { id }); }
    setSavingGuide(false);
  };

  // ── Determinar en qué paso del flujo estamos ─────────────────────────────

  // PASO 0: cancelado
  if (isCancelled) {
    return (
      <div className="kyzz-panel px-6 py-5">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Gestión de envío</p>
        <p className="text-sm text-red-500">Pedido cancelado.</p>
      </div>
    );
  }

  // PASO 1a: prepago web sin pagar → esperar Wompi
  const waitingOnlinePayment = paymentMethod === 'prepaid' && !localIsPaid && !isManualCh;

  // PASO 1b: prepago canal manual sin pagar → confirmar transferencia
  const waitingManualPayment = paymentMethod === 'prepaid' && !localIsPaid && isManualCh;

  // PASO 1c: COD sin confirmar → confirmar antes de despachar
  const waitingCodConfirm = isCod && !codConfirmed;

  // PASO 2: listo para preparar (tiene pago/confirmación)
  const readyToPrepare = !waitingOnlinePayment && !waitingManualPayment && !waitingCodConfirm
                         && shippingStatus !== 'shipped' && shippingStatus !== 'delivered' && shippingStatus !== 'returned';

  // PASO 3: en camino → confirmar entrega
  const inTransit = shippingStatus === 'shipped';

  // PASO 4: entregado
  const done = shippingStatus === 'delivered' || shippingStatus === 'returned';

  // ── Cabecera del panel ────────────────────────────────────────────────────

  const statusDot = {
    pending:    'bg-kyzz-muted',
    processing: 'bg-blue-500',
    shipped:    'bg-amber-500',
    delivered:  'bg-emerald-500',
    returned:   'bg-red-500',
  }[shippingStatus] ?? 'bg-kyzz-muted';

  const statusLabel = {
    pending:    'Pendiente',
    processing: 'Preparando',
    shipped:    'Enviado',
    delivered:  'Entregado',
    returned:   'Devuelto',
  }[shippingStatus] ?? shippingStatus;

  return (
    <div className="kyzz-panel overflow-hidden divide-y divide-kyzz-secondary">

      {/* CABECERA */}
      <div className="px-5 py-4 flex items-center justify-between gap-2">
        <p className="text-[9px] tracking-[0.3em] uppercase text-kyzz-muted">Gestión de envío</p>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="text-[9px] tracking-widest uppercase px-2 py-0.5 border border-kyzz-secondary text-kyzz-muted">
            {CHANNEL_LABEL[channel] ?? channel} · {isCod ? 'Contraentrega' : 'Prepago'}
          </span>
          <span className="flex items-center gap-1.5 text-[9px] tracking-widest uppercase px-2 py-0.5 border border-kyzz-secondary text-kyzz-muted">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
            {statusLabel}
          </span>
        </div>
      </div>

      {/* ── PASO 1a: Esperando pago online (Wompi) ────────────────────────── */}
      {waitingOnlinePayment && (
        <div className="px-5 py-5 flex gap-3">
          <IoLockClosedOutline size={16} className="text-kyzz-muted mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-kyzz-dark">Esperando pago en línea</p>
            <p className="text-[11px] text-kyzz-muted mt-0.5 leading-relaxed">
              El cliente debe completar el pago por Wompi. La orden se cancela automáticamente en 24h si no paga. No necesitas hacer nada.
            </p>
          </div>
        </div>
      )}

      {/* ── PASO 1b: Confirmar pago por transferencia ─────────────────────── */}
      {waitingManualPayment && (
        <div className="px-5 py-5 space-y-3">
          <div className="flex gap-3">
            <IoLockClosedOutline size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-kyzz-dark">Confirmar pago recibido</p>
              <p className="text-[11px] text-kyzz-muted mt-0.5 leading-relaxed">
                Cuando el cliente envíe el comprobante de transferencia, confirma el pago aquí para continuar.
              </p>
            </div>
          </div>
          {!showPaidForm ? (
            <button
              onClick={() => setShowPaidForm(true)}
              className="w-full py-2.5 text-[10px] tracking-widest uppercase border border-kyzz-dark text-kyzz-dark hover:bg-kyzz-dark hover:text-white transition-colors"
            >
              Confirmar pago recibido
            </button>
          ) : (
            <div className="border border-kyzz-secondary bg-kyzz-tertiary p-4 space-y-3">
              <p className="text-[9px] tracking-[0.3em] uppercase text-kyzz-muted">Registrar pago</p>
              <input className="kyzz-input text-sm w-full" placeholder="Referencia (opcional)" value={payRef}
                onChange={e => setPayRef(e.target.value)} disabled={submittingPay} />
              {proofPreview ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proofPreview} alt="Comprobante" className="w-28 h-28 object-cover border border-kyzz-secondary" />
                  <button onClick={clearFile} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-kyzz-dark text-white flex items-center justify-center rounded-full">
                    <IoCloseOutline size={11} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 text-[10px] tracking-widest uppercase border border-dashed border-kyzz-secondary text-kyzz-muted px-3 py-2.5 cursor-pointer hover:border-kyzz-primary hover:text-kyzz-primary transition-colors">
                  <IoImageOutline size={14} /> Adjuntar comprobante
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={handleFileChange} />
                </label>
              )}
              <button onClick={handleConfirmPay} disabled={submittingPay} className="btn-primary w-full py-2.5 text-[10px] tracking-widest">
                {submittingPay ? 'Registrando…' : 'Confirmar pago'}
              </button>
              <button onClick={() => { setShowPaidForm(false); setPayRef(''); clearFile(); }} disabled={submittingPay}
                className="w-full py-2 text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-dark transition-colors">
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PASO 1c: Confirmar pedido COD por WhatsApp ────────────────────── */}
      {waitingCodConfirm && (
        <div className="px-5 py-5 space-y-3">
          <div className="flex gap-3">
            <IoCheckmarkCircleOutline size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-kyzz-dark">Confirmar pedido COD</p>
              <p className="text-[11px] text-kyzz-muted mt-0.5 leading-relaxed">
                Contacta a la clienta por WhatsApp y verifica que acepte el pedido en la dirección indicada antes de generar la guía. Sin esta confirmación, arriesgas pagar el flete sin cobrar.
              </p>
            </div>
          </div>
          <button
            onClick={() => run(() => confirmCodOrder(orderId), 'Confirmando...')}
            disabled={busy}
            className="btn-primary w-full py-2.5 text-[10px] tracking-widest disabled:opacity-50"
          >
            {busy ? 'Procesando…' : 'Ya hablé con la clienta — Confirmar pedido'}
          </button>
        </div>
      )}

      {/* ── PASO 2: Preparar el envío ─────────────────────────────────────── */}
      {readyToPrepare && (
        <div className="px-5 py-5 space-y-5">

          {/* Instrucción del paso */}
          <div className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-kyzz-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <p className="text-sm font-medium text-kyzz-dark">Preparar el envío</p>
              <p className="text-[11px] text-kyzz-muted mt-0.5 leading-relaxed">
                Genera la guía en tu plataforma (Heka, Mipaquete, Envia.com…), empaca el pedido y registra el número de guía aquí para que la clienta pueda rastrear.
              </p>
            </div>
          </div>

          {/* Guía ya registrada → mostrar con link */}
          {hasGuide && (
            <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2.5">
              <div>
                <p className="text-[9px] tracking-widest uppercase text-emerald-600 mb-0.5">Guía registrada</p>
                <p className="text-sm font-mono font-medium text-kyzz-dark">{currentTracking}</p>
              </div>
              {trackUrl && (
                <a href={trackUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1 text-[10px] tracking-widest uppercase text-kyzz-primary hover:text-kyzz-dark transition-colors">
                  <IoOpenOutline size={12} /> Rastrear
                </a>
              )}
            </div>
          )}

          {/* Formulario de guía */}
          <div className="space-y-2">
            <p className="text-[9px] tracking-[0.3em] uppercase text-kyzz-muted">
              {hasGuide ? 'Actualizar guía' : 'Registrar número de guía'}
            </p>
            <select className="kyzz-input text-sm w-full" value={carrier} onChange={e => setCarrier(e.target.value as Carrier)}>
              {CARRIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="flex gap-2">
              <input className="kyzz-input text-sm flex-1 min-w-0" placeholder="Número de guía (ej: 8321456789)"
                value={tracking} onChange={e => setTracking(e.target.value)} />
              <input type="number" className="kyzz-input text-sm w-24 shrink-0" placeholder="Flete $"
                value={cost} onChange={e => setCost(e.target.value)} />
            </div>
            <button onClick={handleSaveGuide} disabled={savingGuide}
              className="w-full py-2 text-[10px] tracking-widest uppercase border border-kyzz-secondary text-kyzz-muted hover:border-kyzz-dark hover:text-kyzz-dark transition-colors disabled:opacity-50">
              {savingGuide ? 'Guardando…' : hasGuide ? 'Actualizar guía' : 'Guardar guía'}
            </button>
          </div>

          {/* Divisor */}
          <div className="border-t border-kyzz-secondary" />

          {/* Acción principal: marcar enviado */}
          <div className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-kyzz-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-kyzz-dark">Marcar como enviado</p>
              <p className="text-[11px] text-kyzz-muted leading-relaxed">
                Haz esto cuando la transportadora ya recogió el paquete en tu dirección. Descuenta el stock de bodega y notifica a la clienta por email.
              </p>
              <button
                onClick={() => run(() => updateOrderShipping({ orderId, shippingStatus: 'shipped' }), 'Actualizando...')}
                disabled={busy}
                className="btn-primary w-full py-2.5 text-[10px] tracking-widest disabled:opacity-50"
              >
                <IoRocketOutline className="inline mr-2" size={14} />
                {busy ? 'Actualizando…' : 'El mensajero recogió el pedido — Marcar enviado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 3: En camino → confirmar entrega ────────────────────────── */}
      {inTransit && (
        <div className="px-5 py-5 space-y-4">

          {/* Guía registrada */}
          {hasGuide && (
            <div className="flex items-center justify-between gap-2 bg-kyzz-tertiary border border-kyzz-secondary px-3 py-2.5">
              <div>
                <p className="text-[9px] tracking-widest uppercase text-kyzz-muted mb-0.5">Guía de envío</p>
                <p className="text-sm font-mono font-medium text-kyzz-dark">{currentTracking}</p>
              </div>
              {trackUrl && (
                <a href={trackUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1 text-[10px] tracking-widest uppercase text-kyzz-primary hover:text-kyzz-dark transition-colors">
                  <IoOpenOutline size={12} /> Rastrear
                </a>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-kyzz-dark">Pedido en camino</p>
              <p className="text-[11px] text-kyzz-muted leading-relaxed">
                El pedido está con la transportadora. Cuando {isCod
                  ? 'Heka/Mipaquete te confirme la entrega y el recaudo del efectivo,'
                  : 'la transportadora confirme la entrega,'
                } márcalo como entregado.
                {isCod && (
                  <span className="block mt-1 font-medium text-kyzz-dark">
                    Al marcar entregado, el pago en efectivo queda registrado automáticamente.
                  </span>
                )}
              </p>
              <button
                onClick={() => run(() => updateOrderShipping({ orderId, shippingStatus: 'delivered' }), 'Actualizando...')}
                disabled={busy}
                className="btn-primary w-full py-2.5 text-[10px] tracking-widest disabled:opacity-50"
              >
                <IoCheckmarkDoneOutline className="inline mr-2" size={14} />
                {busy ? 'Actualizando…' : 'La transportadora entregó el pedido — Marcar entregado'}
              </button>
            </div>
          </div>

          {/* Actualizar guía si hace falta */}
          {!hasGuide && (
            <div className="space-y-2 pt-2 border-t border-kyzz-secondary">
              <p className="text-[9px] tracking-[0.3em] uppercase text-kyzz-muted">Registrar guía (opcional)</p>
              <select className="kyzz-input text-sm w-full" value={carrier} onChange={e => setCarrier(e.target.value as Carrier)}>
                {CARRIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div className="flex gap-2">
                <input className="kyzz-input text-sm flex-1 min-w-0" placeholder="Número de guía"
                  value={tracking} onChange={e => setTracking(e.target.value)} />
                <button onClick={handleSaveGuide} disabled={savingGuide}
                  className="btn-primary shrink-0 px-4 text-[10px] tracking-widest disabled:opacity-50">
                  {savingGuide ? '…' : 'Guardar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PASO 4: Completado ────────────────────────────────────────────── */}
      {done && (
        <div className="px-5 py-5 flex gap-3">
          <IoCheckmarkDoneOutline size={16} className={`mt-0.5 shrink-0 ${shippingStatus === 'returned' ? 'text-red-400' : 'text-emerald-500'}`} />
          <div>
            <p className="text-sm font-medium text-kyzz-dark">
              {shippingStatus === 'returned' ? 'Pedido devuelto' : 'Pedido entregado'}
            </p>
            <p className="text-[11px] text-kyzz-muted mt-0.5 leading-relaxed">
              {shippingStatus === 'returned'
                ? 'El pedido fue devuelto. Si es necesario, gestiona la devolución en el panel de abajo.'
                : isCod
                  ? 'Entregado y cobro en efectivo registrado. Ciclo completo.'
                  : 'Pedido entregado exitosamente. Ciclo completo.'}
            </p>
          </div>
        </div>
      )}

      {/* ── CORRECCIÓN DE ESTADO (siempre al fondo, discreta) ────────────── */}
      <div>
        <button
          onClick={() => setShowOverride(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-kyzz-tertiary transition-colors text-left"
        >
          <p className="text-[9px] tracking-widest uppercase text-kyzz-muted">Corregir estado manualmente</p>
          <IoChevronDownOutline size={11} className={`text-kyzz-muted transition-transform duration-200 ${showOverride ? 'rotate-180' : ''}`} />
        </button>
        {showOverride && (
          <div className="px-5 pb-4 space-y-3 border-t border-kyzz-secondary">
            <p className="text-[10px] text-kyzz-muted pt-3 leading-relaxed">
              Solo si algo salió del flujo normal. En el flujo estándar usa los botones de arriba.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(['pending','processing','shipped','delivered','returned'] as ShippingStatus[]).map((s) => {
                const labels: Record<ShippingStatus,string> = {
                  pending:'Pendiente', processing:'Procesando', shipped:'Enviado', delivered:'Entregado', returned:'Devuelto',
                };
                const colors: Record<ShippingStatus,string> = {
                  pending: 'text-kyzz-muted border-kyzz-secondary',
                  processing: 'text-blue-700 border-blue-200 bg-blue-50',
                  shipped: 'text-amber-700 border-amber-200 bg-amber-50',
                  delivered: 'text-emerald-700 border-emerald-200 bg-emerald-50',
                  returned: 'text-red-600 border-red-200 bg-red-50',
                };
                const locked = !canAdvance && ['processing','shipped','delivered'].includes(s);
                return (
                  <button key={s}
                    onClick={() => !locked && setOverrideStatus(s)}
                    disabled={locked}
                    className={`px-3 py-1.5 text-[10px] tracking-widest uppercase border transition-all ${
                      locked ? 'opacity-30 cursor-not-allowed text-kyzz-muted border-kyzz-secondary'
                        : overrideStatus === s ? colors[s] + ' font-medium'
                        : 'text-kyzz-muted border-kyzz-secondary hover:border-kyzz-primary hover:text-kyzz-primary'
                    }`}
                  >
                    {labels[s]}
                  </button>
                );
              })}
            </div>
            <textarea className="kyzz-input text-sm resize-none w-full" rows={2}
              placeholder="Notas internas (opcional)..." value={notes} onChange={e => setNotes(e.target.value)} />
            <button
              onClick={async () => {
                if (!canAdvance && ['processing','shipped','delivered'].includes(overrideStatus)) {
                  toast.error('El pedido debe estar pagado.'); return;
                }
                setSavingOverride(true);
                const id = toast.loading('Actualizando...');
                try {
                  const res = await updateOrderShipping({ orderId, shippingStatus: overrideStatus, shippingNotes: notes || undefined });
                  if (res.ok) { toast.success('Estado actualizado', { id }); router.refresh(); }
                  else        { toast.error(res.message ?? 'Error', { id }); }
                } catch {
                  toast.error('Error inesperado al actualizar', { id });
                } finally {
                  setSavingOverride(false);
                }
              }}
              disabled={savingOverride}
              className="btn-primary w-full py-2 text-[10px] tracking-widest disabled:opacity-50"
            >
              {savingOverride ? 'Guardando…' : 'Actualizar estado'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
