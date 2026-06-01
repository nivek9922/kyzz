'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { IoCloudUploadOutline, IoCloseOutline, IoSendOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import { updateReturnTracking } from '@/actions/return/update-return-tracking';
import { uploadReturnEvidence } from '@/actions/return/upload-return-evidence';
import type { ReturnStatus, ShippingResponsibility, RefundStatus } from '@prisma/client';

interface Props {
  returnId:           string;
  rmaCode:            string | null | undefined;
  status:             ReturnStatus;
  returnTrackingCode: string | null;
  returnCarrier:      string | null;
  proofImageUrl:      string | null;
  expiresAt:          Date | null;
  whoPayShipping:     ShippingResponsibility | null;
  refundAmount:       number | null;
  refundMethod:       string | null;
  refundStatus:       RefundStatus | null;
}

const CARRIERS = [
  { value: '',                label: 'Selecciona la transportadora' },
  { value: 'Coordinadora',    label: 'Coordinadora' },
  { value: 'Servientrega',    label: 'Servientrega' },
  { value: 'Interrapidísimo', label: 'Interrapidísimo' },
  { value: 'Envia.com',       label: 'Envia.com' },
  { value: 'TCC',             label: 'TCC' },
  { value: 'Otra',            label: 'Otra' },
];

export function CustomerReturnActions({
  returnId, rmaCode, status, returnTrackingCode, returnCarrier, proofImageUrl,
  expiresAt, whoPayShipping, refundAmount, refundMethod, refundStatus,
}: Props) {
  const router              = useRouter();
  const [isPending, start]  = useTransition();

  // ── Tracking form state ──────────────────────────────────────────────────
  const [trackingCode,  setTrackingCode]  = useState('');
  const [carrier,       setCarrier]       = useState('');
  const [showTracking,  setShowTracking]  = useState(false);

  // ── Evidence upload state ────────────────────────────────────────────────
  const [preview,       setPreview]       = useState<string | null>(null);
  const [file,          setFile]          = useState<File | null>(null);
  const fileRef                           = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error('Máximo 5MB'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearFile = () => {
    setFile(null);
    if (preview) { URL.revokeObjectURL(preview); setPreview(null); }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmitTracking = () => {
    if (!trackingCode.trim()) { toast.error('Ingresa el número de guía'); return; }
    start(async () => {
      const res = await updateReturnTracking({ returnId, trackingCode: trackingCode.trim(), carrier: carrier || undefined });
      if (res.ok) {
        toast.success('Código de envío registrado');
        router.refresh();
      } else {
        toast.error(res.message ?? 'Error');
      }
    });
  };

  const handleSubmitEvidence = () => {
    if (!file) { toast.error('Selecciona una imagen'); return; }
    start(async () => {
      const b64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const res = await uploadReturnEvidence({ returnId, base64: b64, mimeType: file.type });
      if (res.ok) {
        toast.success('Evidencia enviada. La revisaremos pronto.');
        router.refresh();
      } else {
        toast.error(res.message ?? 'Error al subir la imagen');
      }
    });
  };

  // ── COMPLETED — mostrar resolución ──────────────────────────────────────
  if (status === 'COMPLETED') {
    return (
      <div className="kyzz-panel p-5 space-y-2">
        <div className="flex gap-2 items-center">
          <IoCheckmarkCircleOutline size={16} className="text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-kyzz-dark">Solicitud completada</p>
        </div>
        {refundAmount && refundMethod && (
          <p className="text-xs text-kyzz-muted">
            Reembolso de <strong>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(refundAmount)}</strong>{' '}
            vía {refundMethod}.
            {refundStatus === 'PROCESSED' ? ' Ya fue procesado.' : refundStatus === 'PROCESSING' ? ' En proceso de transferencia.' : ''}
          </p>
        )}
      </div>
    );
  }

  // ── EVIDENCE_REQUIRED — subir fotos ─────────────────────────────────────
  if (status === 'EVIDENCE_REQUIRED') {
    return (
      <div className="kyzz-panel p-5 space-y-4">
        <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted">Subir evidencia fotográfica</p>

        {proofImageUrl ? (
          <div className="space-y-2">
            <p className="text-xs text-emerald-600">Foto enviada — estamos revisando.</p>
            <a href={proofImageUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proofImageUrl} alt="Evidencia" className="w-32 h-32 object-cover border border-kyzz-secondary" />
            </a>
          </div>
        ) : (
          <>
            <p className="text-xs text-kyzz-muted leading-relaxed">
              Toma fotos claras del producto mostrando el defecto o problema. Formato JPG, PNG o WebP. Máx. 5MB.
            </p>
            {preview ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Vista previa" className="w-32 h-32 object-cover border border-kyzz-secondary" />
                <button onClick={clearFile} className="absolute -top-2 -right-2 w-5 h-5 bg-kyzz-dark text-white flex items-center justify-center rounded-full">
                  <IoCloseOutline size={11} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-kyzz-secondary px-4 py-4 text-[11px] tracking-widest uppercase text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary transition-colors">
                <IoCloudUploadOutline size={16} />
                Seleccionar foto
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic"
                  className="hidden" onChange={handleFileChange} />
              </label>
            )}
            {file && (
              <button onClick={handleSubmitEvidence} disabled={isPending}
                className="btn-primary w-full py-2.5 text-[10px] tracking-widest disabled:opacity-50">
                <IoSendOutline className="inline mr-2" size={13} />
                {isPending ? 'Enviando...' : 'Enviar evidencia'}
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  // ── GUIDE_SENT + KYZZ paga — guía prepagada, cliente solo entrega ──────────
  if (status === 'GUIDE_SENT' && whoPayShipping === 'KYZZ') {
    return (
      <div className="kyzz-panel p-5 space-y-4">
        <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted">Instrucciones de envío</p>

        {returnTrackingCode && (
          <div className="bg-kyzz-tertiary border border-kyzz-secondary p-4 space-y-1">
            <p className="text-[10px] tracking-widest uppercase text-kyzz-muted">Número de guía</p>
            <p className="text-sm font-mono font-medium text-kyzz-dark">{returnTrackingCode}</p>
            {returnCarrier && <p className="text-xs text-kyzz-muted">Transportadora: {returnCarrier}</p>}
          </div>
        )}

        <div className="text-xs text-kyzz-muted leading-relaxed space-y-1.5">
          <p>1. Busca en tu email (o WhatsApp) la guía de devolución que te enviamos.</p>
          <p>2. Empaca el producto con sus etiquetas originales, sin usar.</p>
          <p>3. Ve a cualquier oficina de{returnCarrier ? ` ${returnCarrier}` : ' la transportadora indicada en la guía'}.</p>
          <p>4. Entrega el paquete y muestra la guía — <strong>el envío ya está pagado por KYZZ, no pagas nada.</strong></p>
        </div>

        {expiresAt && expiresAt > new Date() && (
          <p className="text-[10px] text-kyzz-muted border-t border-kyzz-secondary pt-3">
            Tienes hasta el{' '}
            {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(expiresAt)}{' '}
            para entregar el paquete.
          </p>
        )}
      </div>
    );
  }

  // ── APPROVED / GUIDE_SENT — cliente paga flete, ingresa su guía ─────────
  if (['APPROVED', 'GUIDE_SENT'].includes(status)) {
    if (returnTrackingCode) {
      return (
        <div className="kyzz-panel p-5 space-y-2">
          <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted">Guía de regreso registrada</p>
          <p className="text-sm font-mono text-kyzz-dark">{returnTrackingCode}</p>
          {returnCarrier && <p className="text-xs text-kyzz-muted">{returnCarrier}</p>}
          <p className="text-xs text-kyzz-muted">Esperamos recibir tu paquete en los próximos días hábiles.</p>
        </div>
      );
    }

    return (
      <div className="kyzz-panel p-5 space-y-4">
        <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted">Instrucciones de envío</p>

        <div className="bg-kyzz-tertiary border border-kyzz-secondary p-4 space-y-1.5">
          <p className="text-[10px] tracking-widest uppercase text-kyzz-muted">Dirección de bodega KYZZ</p>
          <p className="text-sm font-medium text-kyzz-dark">Calle 70 bis Norte #4cn-103</p>
          <p className="text-xs text-kyzz-muted">Cali, Valle del Cauca, Colombia</p>
          {rmaCode && (
            <p className="text-xs text-kyzz-muted pt-1 border-t border-kyzz-secondary">
              Escribe el código{' '}
              <span className="font-mono font-medium text-kyzz-dark">{rmaCode}</span>{' '}
              visible en el exterior del paquete.
            </p>
          )}
        </div>

        <div className="text-xs text-kyzz-muted leading-relaxed space-y-1">
          <p>1. Empaca el producto con sus etiquetas originales, sin usar.</p>
          <p>2. Llévalo a la oficina de cualquier transportadora de tu ciudad (Coordinadora, Servientrega, Interrapidísimo, TCC, Envia.com, etc.).</p>
          <p>3. Envíalo a la dirección indicada arriba.</p>
          <p>4. Guarda el número de guía que te den y regístralo aquí abajo.</p>
        </div>

        {expiresAt && expiresAt > new Date() && (
          <p className="text-[10px] text-kyzz-muted border-t border-kyzz-secondary pt-3">
            Tienes hasta el{' '}
            {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(expiresAt)}{' '}
            para enviar el producto.
          </p>
        )}

        {!showTracking ? (
          <button onClick={() => setShowTracking(true)}
            className="btn-primary w-full py-2.5 text-[10px] tracking-widests">
            Ya lo envié — registrar número de guía
          </button>
        ) : (
          <div className="space-y-3">
            <input value={trackingCode} onChange={e => setTrackingCode(e.target.value)}
              className="kyzz-input text-sm w-full" placeholder="Número de guía (ej: 8321456789)" />
            <select value={carrier} onChange={e => setCarrier(e.target.value)}
              className="kyzz-input text-sm w-full">
              {CARRIERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={handleSubmitTracking} disabled={isPending || !trackingCode.trim()}
                className="btn-primary flex-1 py-2.5 text-[10px] tracking-widests disabled:opacity-50">
                {isPending ? 'Guardando...' : 'Confirmar envío'}
              </button>
              <button onClick={() => setShowTracking(false)}
                className="text-[11px] tracking-widests uppercase text-kyzz-muted hover:text-kyzz-dark transition-colors px-3">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null; // Sin acción disponible en otros estados
}
