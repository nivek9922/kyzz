'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { IoOpenOutline } from 'react-icons/io5';
import type { Carrier } from '@prisma/client';
import { upsertShipment } from '@/actions';
import { CARRIER_OPTIONS, carrierTrackingUrl } from '@/lib/shipping/carriers';

interface Props {
  orderId:         string;
  currentCarrier:  Carrier | null;
  currentTracking: string | null;
  currentCost:     number | null;
}

export const ShipmentPanel = ({ orderId, currentCarrier, currentTracking, currentCost }: Props) => {
  const [carrier,  setCarrier]  = useState<Carrier>(currentCarrier ?? 'manual');
  const [tracking, setTracking] = useState(currentTracking ?? '');
  const [cost,     setCost]     = useState(currentCost != null ? String(currentCost) : '');
  const [saving,   setSaving]   = useState(false);

  const trackingUrl = carrierTrackingUrl(carrier, tracking.trim() || null);

  const handleSave = async () => {
    setSaving(true);
    const id = toast.loading('Guardando envío...');
    const res = await upsertShipment({
      orderId,
      carrier,
      trackingCode: tracking.trim() || undefined,
      cost:         cost.trim() ? Number(cost) : undefined,
    });
    if (res.ok) toast.success('Envío guardado', { id });
    else        toast.error(res.message ?? 'Error', { id });
    setSaving(false);
  };

  return (
    <div className="kyzz-panel p-6 mt-6 space-y-4">
      <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted">Guía / Transportadora</p>

      {/* Transportadora */}
      <div>
        <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-2">Transportadora</label>
        <select
          className="kyzz-input text-sm"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value as Carrier)}
        >
          {CARRIER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Número de guía */}
      <div>
        <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-2">Número de guía</label>
        <input
          className="kyzz-input text-sm"
          placeholder="Ej: 240012345678"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
        />
        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-[10px] tracking-widest uppercase text-kyzz-primary hover:text-kyzz-dark transition-colors"
          >
            <IoOpenOutline size={12} />
            Ver rastreo
          </a>
        )}
      </div>

      {/* Costo del flete */}
      <div>
        <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-2">
          Costo del flete <span className="normal-case tracking-normal text-kyzz-muted/60">(opcional)</span>
        </label>
        <input
          type="number"
          className="kyzz-input text-sm"
          placeholder="Ej: 12000"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
        {saving ? 'Guardando...' : 'Guardar envío'}
      </button>
    </div>
  );
};
