"use client";

import { useState } from "react";
import { IoAddOutline, IoPencilOutline } from "react-icons/io5";
import { titleFont } from "@/config/fonts";
import { currencyFormat } from "@/utils";
import { CouponType } from "@prisma/client";
import { CouponForm } from "./CouponForm";

type Coupon = {
  id:             string;
  code:           string;
  type:           CouponType;
  value:          number;
  isActive:       boolean;
  subscriberOnly: boolean;
  minimumAmount:  number | null;
  usageLimit:     number | null;
  usageCount:     number;
  expiresAt:      Date | null;
  _count:         { redemptions: number };
};

interface Props { initialCoupons: Coupon[]; }

export const CouponsClient = ({ initialCoupons }: Props) => {
  const [coupons,  setCoupons]  = useState(initialCoupons);
  const [creating, setCreating] = useState(false);
  const [editing,  setEditing]  = useState<Coupon | null>(null);

  const handleDone = () => {
    setCreating(false);
    setEditing(null);
    /* Reload: simple window refresh to re-fetch server data */
    window.location.reload();
  };

  const now = new Date();

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Admin</p>
          <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
            Cupones
          </h1>
          <div className="w-6 h-px bg-kyzz-secondary mt-3" />
        </div>
        {!creating && !editing && (
          <button
            onClick={() => setCreating(true)}
            className="btn-primary-outline flex items-center gap-2"
          >
            <IoAddOutline className="w-4 h-4" />
            Nuevo cupón
          </button>
        )}
      </div>

      {/* Form inline */}
      {(creating || editing) && (
        <div className="kyzz-panel mb-8">
          <h2 className={`${titleFont.className} text-xl font-normal text-kyzz-dark mb-6`}>
            {editing ? `Editar — ${editing.code}` : "Nuevo cupón"}
          </h2>
          <CouponForm coupon={editing ?? undefined} onDone={handleDone} />
        </div>
      )}

      {/* Tabla */}
      {coupons.length === 0 ? (
        <div className="kyzz-panel text-center py-16">
          <p className="text-[11px] tracking-widest uppercase text-kyzz-muted">
            No hay cupones creados
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-kyzz-secondary">
                {["Código", "Tipo", "Valor", "Usos", "Activo", "Expiración", ""].map((h) => (
                  <th key={h} className="text-left text-[9px] tracking-[0.3em] uppercase text-kyzz-muted py-3 pr-6 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-kyzz-secondary/50">
              {coupons.map((c) => {
                const expired = c.expiresAt && c.expiresAt < now;
                return (
                  <tr key={c.id} className="hover:bg-kyzz-tertiary/40 transition-colors">
                    <td className="py-4 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[13px] text-kyzz-dark tracking-wider">{c.code}</span>
                        {c.subscriberOnly && (
                          <span className="text-[8px] tracking-widest uppercase text-kyzz-primary border border-kyzz-primary/30 px-1.5 py-0.5">
                            Newsletter
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pr-6 text-[11px] text-kyzz-muted">
                      {c.type === CouponType.PERCENTAGE ? "Porcentaje" : "Fijo"}
                    </td>
                    <td className="py-4 pr-6 text-[13px] text-kyzz-dark">
                      {c.type === CouponType.PERCENTAGE ? `${c.value}%` : currencyFormat(c.value)}
                    </td>
                    <td className="py-4 pr-6 text-[11px] text-kyzz-muted">
                      {c._count.redemptions}
                      {c.usageLimit !== null && <span className="text-kyzz-secondary"> / {c.usageLimit}</span>}
                    </td>
                    <td className="py-4 pr-6">
                      <span className={`inline-block w-2 h-2 rounded-full ${c.isActive && !expired ? "bg-emerald-400" : "bg-kyzz-secondary"}`} />
                    </td>
                    <td className="py-4 pr-6 text-[11px] text-kyzz-muted">
                      {c.expiresAt
                        ? <span className={expired ? "text-red-400" : ""}>
                            {new Date(c.expiresAt).toLocaleDateString("es-CO")}
                          </span>
                        : "—"}
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => setEditing(c)}
                        className="text-kyzz-muted hover:text-kyzz-dark transition-colors"
                        aria-label="Editar"
                      >
                        <IoPencilOutline className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
