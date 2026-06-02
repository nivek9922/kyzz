"use client";

import { useState } from "react";
import { IoCloseOutline } from "react-icons/io5";
import { validateCoupon } from "@/actions/coupon";
import { useCouponStore } from "@/store";
import { currencyFormat } from "@/utils";

interface Props { subtotal: number; }

export const CouponInput = ({ subtotal }: Props) => {
  const { coupon, applyCoupon, removeCoupon } = useCouponStore();

  const [code,    setCode]    = useState("");
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError("Ingresa un código de descuento."); return; }
    setError(null);
    setLoading(true);
    const result = await validateCoupon(trimmed, subtotal);
    setLoading(false);

    if (!result.ok || !result.coupon) {
      setError(result.message ?? "Cupón no válido.");
      return;
    }
    applyCoupon(result.coupon);
    setCode("");
  };

  const handleRemove = () => { removeCoupon(); setCode(""); setError(null); };

  /* Cupón ya aplicado */
  if (coupon) {
    return (
      <div className="flex items-center justify-between py-2.5">
        <div>
          <span className="text-[10px] tracking-widest uppercase text-kyzz-primary font-medium">
            {coupon.code}
          </span>
          <span className="ml-2 text-[10px] text-kyzz-muted">
            {coupon.type === "PERCENTAGE" ? `−${coupon.value}%` : `−${currencyFormat(coupon.value)}`}
          </span>
        </div>
        <button
          onClick={handleRemove}
          className="text-kyzz-muted hover:text-kyzz-dark transition-colors"
          aria-label="Quitar cupón"
        >
          <IoCloseOutline className="w-4 h-4" />
        </button>
      </div>
    );
  }

  /* Formulario */
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
          placeholder="Código de descuento"
          className="kyzz-input flex-1 text-[12px] uppercase placeholder:normal-case"
          aria-label="Código de descuento"
        />
        <button
          onClick={handleApply}
          disabled={loading}
          className="text-[10px] tracking-[0.18em] uppercase text-kyzz-dark hover:text-kyzz-primary disabled:text-kyzz-muted transition-colors shrink-0 py-2 px-1"
        >
          {loading ? "..." : "Aplicar"}
        </button>
      </div>
      {error && (
        <p className="text-[10px] text-red-500 tracking-wide">{error}</p>
      )}
    </div>
  );
};
