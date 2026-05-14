"use client";

import { FREE_SHIPPING_THRESHOLD } from "@/config/constants";
import { currencyFormat } from "@/utils";

interface Props {
  subTotal: number;
}

const TruckIcon = ({ achieved }: { achieved: boolean }) => (
  <svg
    viewBox="0 0 48 32"
    fill="none"
    className={`w-7 h-5 transition-all duration-500 ${achieved ? "text-kyzz-dark" : "text-kyzz-muted"}`}
  >
    {/* Cabina */}
    <rect x="28" y="6" width="18" height="16" rx="2" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
    {/* Carrocería */}
    <rect x="2" y="2" width="28" height="20" rx="2" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5" />
    {/* Ventana */}
    <rect x="31" y="9" width="8" height="7" rx="1" fill="currentColor" opacity="0.3" />
    {/* Eje trasero */}
    <line x1="2" y1="22" x2="46" y2="22" stroke="currentColor" strokeWidth="1.5" />
    {/* Rueda izquierda */}
    <circle cx="10" cy="27" r="4" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="10" cy="27" r="1.5" fill="currentColor" />
    {/* Rueda derecha */}
    <circle cx="38" cy="27" r="4" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="38" cy="27" r="1.5" fill="currentColor" />
  </svg>
);

export const FreeShippingBar = ({ subTotal }: Props) => {
  const remaining = FREE_SHIPPING_THRESHOLD - subTotal;
  const progress = Math.min((subTotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const achieved = remaining <= 0;

  return (
    <div className="mb-6 space-y-2.5">
      {/* Texto de estado */}
      <div className="flex items-center justify-between">
        {achieved ? (
          <p className="text-xs tracking-wide text-kyzz-dark font-medium">
            ¡Envío gratis desbloqueado!
          </p>
        ) : (
          <p className="text-xs text-kyzz-muted">
            Agrega{" "}
            <span className="text-kyzz-dark font-medium">{currencyFormat(remaining)}</span>
            {" "}más para envío gratis
          </p>
        )}
        {achieved && (
          <span className="text-[10px] tracking-widest uppercase text-kyzz-dark">Gratis</span>
        )}
      </div>

      {/* Barra con camión */}
      <div className="relative">
        {/* Track */}
        <div className="h-1 w-full bg-kyzz-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              achieved ? "bg-kyzz-dark" : "bg-kyzz-muted"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Camión — se mueve sobre el track */}
        <div
          className="absolute -top-5 transition-all duration-700 ease-out"
          style={{
            left: `clamp(0%, calc(${progress}% - 14px), calc(100% - 28px))`,
          }}
        >
          <TruckIcon achieved={achieved} />
        </div>
      </div>

      {/* Espaciador para el camión */}
      <div className="h-1" />
    </div>
  );
};
