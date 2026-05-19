"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CouponType, CouponCampaign } from "@prisma/client";
import { createUpdateCoupon } from "@/actions/coupon";
import type { CouponInput } from "@/actions/coupon";

type ExistingCoupon = {
  id:             string;
  code:           string;
  type:           CouponType;
  value:          number;
  campaign:       CouponCampaign;
  description:    string | null;
  isActive:       boolean;
  subscriberOnly: boolean;
  minimumAmount:  number | null;
  usageLimit:     number | null;
  expiresAt:      Date | null;
};

interface Props { coupon?: ExistingCoupon; onDone: () => void; }

const CAMPAIGN_LABELS: Record<CouponCampaign, string> = {
  newsletter_welcome: "Bienvenida newsletter",
  first_purchase:     "Primera compra",
  seasonal:           "Campaña temporal",
  influencer:         "Influencer",
  category:           "Por categoría",
  free_shipping:      "Envío gratis",
  vip:                "VIP",
  general:            "General",
};

const empty: CouponInput = {
  code:           "",
  type:           CouponType.PERCENTAGE,
  value:          10,
  campaign:       CouponCampaign.general,
  description:    null,
  isActive:       true,
  subscriberOnly: false,
  minimumAmount:  null,
  usageLimit:     null,
  expiresAt:      null,
};

export const CouponForm = ({ coupon, onDone }: Props) => {
  const isEdit = !!coupon;

  const [form, setForm] = useState<CouponInput>(
    coupon
      ? {
          id:             coupon.id,
          code:           coupon.code,
          type:           coupon.type,
          value:          coupon.value,
          campaign:       coupon.campaign,
          description:    coupon.description,
          isActive:       coupon.isActive,
          subscriberOnly: coupon.subscriberOnly,
          minimumAmount:  coupon.minimumAmount,
          usageLimit:     coupon.usageLimit,
          expiresAt:      coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
        }
      : empty
  );

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const set = <K extends keyof CouponInput>(k: K, v: CouponInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await createUpdateCoupon(form);
    setLoading(false);
    if (!result.ok) { setError(result.message ?? "Error"); return; }
    toast.success(isEdit ? "Cupón actualizado" : "Cupón creado");
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Fila 1: Código + Tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] tracking-widest uppercase text-kyzz-muted mb-1.5">Código</label>
          <input type="text" value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="KYZZ10" required className="kyzz-input text-[13px] uppercase" />
        </div>
        <div>
          <label className="block text-[10px] tracking-widest uppercase text-kyzz-muted mb-1.5">Tipo</label>
          <select value={form.type} onChange={(e) => set("type", e.target.value as CouponType)}
            className="kyzz-input text-[13px]">
            <option value={CouponType.PERCENTAGE}>Porcentaje (%)</option>
            <option value={CouponType.FIXED}>Valor fijo (COP)</option>
          </select>
        </div>
      </div>

      {/* Fila 2: Valor + Mínimo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] tracking-widests uppercase text-kyzz-muted mb-1.5">
            Valor {form.type === CouponType.PERCENTAGE ? "(%)" : "(COP)"}
          </label>
          <input type="number" min={0.01} step="any" value={form.value}
            onChange={(e) => set("value", Number(e.target.value))}
            required className="kyzz-input text-[13px]" />
        </div>
        <div>
          <label className="block text-[10px] tracking-widests uppercase text-kyzz-muted mb-1.5">Mínimo de compra (COP)</label>
          <input type="number" min={0} step="any" value={form.minimumAmount ?? ""}
            onChange={(e) => set("minimumAmount", e.target.value ? Number(e.target.value) : null)}
            placeholder="Sin mínimo" className="kyzz-input text-[13px]" />
        </div>
      </div>

      {/* Fila 3: Campaña + Límite */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] tracking-widests uppercase text-kyzz-muted mb-1.5">Campaña</label>
          <select value={form.campaign} onChange={(e) => set("campaign", e.target.value as CouponCampaign)}
            className="kyzz-input text-[13px]">
            {(Object.entries(CAMPAIGN_LABELS) as [CouponCampaign, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] tracking-widests uppercase text-kyzz-muted mb-1.5">Límite de usos</label>
          <input type="number" min={1} step={1} value={form.usageLimit ?? ""}
            onChange={(e) => set("usageLimit", e.target.value ? Number(e.target.value) : null)}
            placeholder="Ilimitado" className="kyzz-input text-[13px]" />
        </div>
      </div>

      {/* Fila 4: Descripción + Expiración */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] tracking-widests uppercase text-kyzz-muted mb-1.5">Descripción / Notas</label>
          <input type="text" value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value || null)}
            placeholder="Ej: Campaña Black Friday 2026" className="kyzz-input text-[13px]" />
        </div>
        <div>
          <label className="block text-[10px] tracking-widests uppercase text-kyzz-muted mb-1.5">Expiración</label>
          <input type="datetime-local" value={form.expiresAt ? form.expiresAt.slice(0, 16) : ""}
            onChange={(e) => set("expiresAt", e.target.value ? new Date(e.target.value).toISOString() : null)}
            className="kyzz-input text-[13px]" />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-6 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="accent-kyzz-primary w-3.5 h-3.5" />
          <span className="text-[11px] tracking-wide text-kyzz-dark">Activo</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.subscriberOnly}
            onChange={(e) => set("subscriberOnly", e.target.checked)}
            className="accent-kyzz-primary w-3.5 h-3.5" />
          <span className="text-[11px] tracking-wide text-kyzz-dark">Solo suscriptoras</span>
        </label>
      </div>

      {error && <p className="text-[11px] text-red-500">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={loading}
          className={loading ? "btn-disabled" : "btn-primary"}>
          {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear cupón"}
        </button>
        <button type="button" onClick={onDone} className="btn-secondary">Cancelar</button>
      </div>
    </form>
  );
};
