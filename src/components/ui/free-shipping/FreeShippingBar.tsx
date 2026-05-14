"use client";

import { FREE_SHIPPING_THRESHOLD } from "@/config/constants";
import { currencyFormat } from "@/utils";

interface Props {
  subTotal: number;
}

export const FreeShippingBar = ({ subTotal }: Props) => {
  const remaining = FREE_SHIPPING_THRESHOLD - subTotal;
  const progress = Math.min((subTotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const achieved = remaining <= 0;

  return (
    <div className="mb-5 space-y-2">
      {achieved ? (
        <p className="text-xs text-center tracking-wide text-kyzz-dark">
          ¡Tienes envío gratis!
        </p>
      ) : (
        <p className="text-xs text-center text-kyzz-muted">
          Te faltan{" "}
          <span className="text-kyzz-dark font-medium">{currencyFormat(remaining)}</span>
          {" "}para envío gratis
        </p>
      )}
      <div className="h-px w-full bg-kyzz-secondary overflow-hidden">
        <div
          className="h-full bg-kyzz-dark transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
