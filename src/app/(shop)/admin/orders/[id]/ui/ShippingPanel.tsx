'use client';

import { useState, useRef, useCallback } from 'react';
import { ShippingStatus } from '@prisma/client';
import { toast } from 'sonner';
import {
  IoLockClosedOutline, IoCheckmarkCircleOutline,
  IoImageOutline, IoCloseOutline,
} from 'react-icons/io5';
import { updateOrderShipping, confirmCodOrder, markOrderAsPaid, uploadProofImage } from '@/actions';

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
  channel:         string;
}

export const ShippingPanel = ({
  orderId, currentStatus, currentTracking, currentNotes, isPaid, isCancelled,
  paymentMethod, codConfirmed, channel,
}: Props) => {
  const [status,       setStatus]       = useState<ShippingStatus>(currentStatus);
  const [tracking,     setTracking]     = useState(currentTracking ?? '');
  const [notes,        setNotes]        = useState(currentNotes ?? '');
  const [saving,       setSaving]       = useState(false);
  const [confirming,   setConfirming]   = useState(false);
  const [localIsPaid,  setLocalIsPaid]  = useState(isPaid);

  // Formulario de confirmación de pago manual
  const [showPaidForm, setShowPaidForm] = useState(false);
  const [payRef,       setPayRef]       = useState('');
  const [proofFile,    setProofFile]    = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submittingPay, setSubmittingPay] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCod = paymentMethod === 'cod';
  // Pedidos de canal web prepaid deben completarse a través del gateway online (Wompi, Addi…).
  // Solo los canales manuales (WhatsApp, Instagram, etc.) permiten marcar el pago a mano.
  const isManualChannel = channel !== 'web';
  const canAdvance = localIsPaid || isCod;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    // 10MB max (comprobantes de Nequi/Bancolombia son JPGs pequeños)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no puede superar 10MB');
      return;
    }
    setProofFile(file);
    setProofPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
  }, []);

  const clearFile = useCallback(() => {
    setProofFile(null);
    setProofPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleConfirmPay = async () => {
    setSubmittingPay(true);
    const toastId = toast.loading('Registrando pago...');

    let proofUrl: string | undefined;

    if (proofFile) {
      // FileReader: API nativa del browser, sin depender de polyfills de Node.
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(proofFile);
      });
      const up = await uploadProofImage(base64, proofFile.type);
      if (!up.ok) {
        toast.error(up.message ?? 'Error subiendo imagen', { id: toastId });
        setSubmittingPay(false);
        return;
      }
      proofUrl = up.url;
    }

    const result = await markOrderAsPaid(orderId, payRef.trim() || undefined, proofUrl);
    if (result.ok) {
      toast.success('Pago registrado', { id: toastId });
      setLocalIsPaid(true);
      setShowPaidForm(false);
    } else {
      toast.error(result.message ?? 'Error', { id: toastId });
    }
    setSubmittingPay(false);
  };

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

      {/* Prepaid web sin pagar: solo el gateway online puede confirmar el pago */}
      {!isCod && !localIsPaid && !isManualChannel && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-3 py-2.5">
          <IoLockClosedOutline className="text-amber-600 mt-0.5 shrink-0" size={14} />
          <p className="text-[11px] text-amber-700 leading-relaxed">
            El pago debe completarse a través del <strong>medio de pago online</strong> (Wompi u otro gateway).
            La orden se cancela automáticamente si no se paga en 24h.
          </p>
        </div>
      )}

      {/* Prepaid canal manual sin pagar: admin puede confirmar con referencia y comprobante */}
      {!isCod && !localIsPaid && isManualChannel && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-3 py-2.5">
            <IoLockClosedOutline className="text-amber-600 mt-0.5 shrink-0" size={14} />
            <p className="text-[11px] text-amber-700 leading-relaxed">
              El pedido <strong>no ha sido pagado</strong>. Confírmalo cuando el cliente envíe el comprobante de transferencia.
            </p>
          </div>

          {!showPaidForm ? (
            <button
              onClick={() => setShowPaidForm(true)}
              className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase border border-kyzz-dark text-kyzz-dark px-3 py-1.5 hover:bg-kyzz-dark hover:text-white transition-colors"
            >
              <IoCheckmarkCircleOutline size={14} />
              Marcar como pagado
            </button>
          ) : (
            <div className="border border-kyzz-secondary p-4 space-y-4 bg-kyzz-tertiary">
              <p className="text-[10px] tracking-widest uppercase text-kyzz-muted">Confirmar pago recibido</p>

              {/* Referencia */}
              <div>
                <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-1.5">
                  Referencia (opcional)
                </label>
                <input
                  className="kyzz-input text-sm"
                  placeholder="Ej: Nequi 1234567890 · Bancolombia TXN-xxx"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                  disabled={submittingPay}
                />
              </div>

              {/* Comprobante de pago */}
              <div>
                <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-1.5">
                  Comprobante (opcional)
                </label>

                {proofPreview ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proofPreview}
                      alt="Comprobante"
                      className="w-32 h-32 object-cover border border-kyzz-secondary"
                    />
                    <button
                      onClick={clearFile}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-kyzz-dark text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <IoCloseOutline size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase border border-dashed border-kyzz-secondary text-kyzz-muted px-3 py-2 cursor-pointer hover:border-kyzz-primary hover:text-kyzz-primary transition-colors">
                    <IoImageOutline size={14} />
                    Adjuntar imagen
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleConfirmPay}
                  disabled={submittingPay}
                  className="btn-primary flex-1"
                >
                  {submittingPay ? 'Registrando…' : 'Confirmar pago'}
                </button>
                <button
                  onClick={() => { setShowPaidForm(false); setPayRef(''); clearFile(); }}
                  disabled={submittingPay}
                  className="px-4 py-2 text-[10px] tracking-widest uppercase border border-kyzz-secondary text-kyzz-muted hover:text-kyzz-dark hover:border-kyzz-dark transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
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
