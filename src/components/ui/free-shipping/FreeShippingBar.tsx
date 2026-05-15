"use client";

import { MdLocalShipping } from "react-icons/md";
import { IoCheckmarkCircle } from "react-icons/io5";
import { FREE_SHIPPING_THRESHOLD } from "@/config/constants";
import { currencyFormat } from "@/utils";

interface Props {
  subTotal: number;
}

export const FreeShippingBar = ({ subTotal }: Props) => {
  const remaining = FREE_SHIPPING_THRESHOLD - subTotal;
  const progress  = Math.min((subTotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const achieved  = remaining <= 0;

  return (
    <div className="mb-6">

      {/* ── Mensaje ── */}
      <div className="flex items-center gap-2 mb-3 min-h-[32px]">
        {achieved ? (
          <>
            <IoCheckmarkCircle
              size={18}
              className="text-kyzz-dark shrink-0"
            />
            <p className="text-xs font-medium text-kyzz-dark leading-relaxed">
              ¡Envío gratis desbloqueado! Tu pedido llega sin costo adicional.
            </p>
          </>
        ) : (
          <p className="text-xs text-kyzz-muted leading-relaxed">
            ¡Ya casi llegas! Te faltan{" "}
            <span className="text-kyzz-dark font-medium">{currencyFormat(remaining)}</span>
            {" "}para obtener{" "}
            <span className="text-kyzz-dark font-medium">¡ENVÍO GRATIS!</span>
          </p>
        )}
      </div>

      {/* ── Track + camión ── */}
      <div className="relative pt-8">

        {/* Camión */}
        <div
          className="absolute top-0 transition-all duration-700 ease-out"
          style={{
            left: `clamp(0%, calc(${progress}% - 14px), calc(100% - 28px))`,
            animation: achieved ? "truck-arrive 0.6s ease-out" : undefined,
          }}
        >
          <MdLocalShipping
            size={28}
            className={`drop-shadow-sm transition-colors duration-500 ${
              achieved ? "text-kyzz-dark" : "text-kyzz-muted"
            }`}
          />
        </div>

        {/* Barra */}
        <div className="relative h-3 w-full rounded-full bg-kyzz-secondary overflow-hidden">
          {/* Relleno */}
          <div
            className="relative h-full rounded-full overflow-hidden transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: achieved ? "var(--kyzz-primary)" : "#2c2c2c",
            }}
          >
            {/* Shimmer — solo mientras no está completo */}
            {!achieved && progress > 0 && (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
                  animation: "shimmer 2s ease-in-out infinite",
                }}
              />
            )}
          </div>
        </div>

        {/* Etiquetas extremos */}
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-kyzz-muted">$0</span>
          <span className="text-[10px] text-kyzz-muted">{currencyFormat(FREE_SHIPPING_THRESHOLD)}</span>
        </div>
      </div>
    </div>
  );
};
