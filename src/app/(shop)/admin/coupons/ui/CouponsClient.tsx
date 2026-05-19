"use client";

import { useState } from "react";
import Link from "next/link";
import { IoAddOutline, IoPencilOutline } from "react-icons/io5";
import { titleFont } from "@/config/fonts";
import { currencyFormat } from "@/utils";
import { CouponType, CouponCampaign } from "@prisma/client";
import { CouponForm } from "./CouponForm";

type Redemption = {
  id:         string;
  email:      string;
  redeemedAt: Date;
  coupon:     { code: string; type: CouponType; value: number };
  order:      { id: string; total: number; couponDiscount: number; isPaid: boolean; createdAt: Date } | null;
};

type Coupon = {
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
  usageCount:     number;
  expiresAt:      Date | null;
  _count:         { redemptions: number };
};

const CAMPAIGN_LABELS: Record<CouponCampaign, string> = {
  newsletter_welcome: "Bienvenida",
  first_purchase:     "1ª compra",
  seasonal:           "Temporal",
  influencer:         "Influencer",
  category:           "Categoría",
  free_shipping:      "Envío gratis",
  vip:                "VIP",
  general:            "General",
};

type Tab = "coupons" | "log";

interface Props {
  initialCoupons:     Coupon[];
  initialRedemptions: Redemption[];
}

export const CouponsClient = ({ initialCoupons, initialRedemptions }: Props) => {
  const [tab,      setTab]      = useState<Tab>("coupons");
  const [creating, setCreating] = useState(false);
  const [editing,  setEditing]  = useState<Coupon | null>(null);

  const handleDone = () => {
    setCreating(false);
    setEditing(null);
    window.location.reload();
  };

  const now = new Date();

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Admin</p>
          <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>Cupones</h1>
          <div className="w-6 h-px bg-kyzz-secondary mt-3" />
        </div>
        {tab === "coupons" && !creating && !editing && (
          <button onClick={() => setCreating(true)} className="btn-primary-outline flex items-center gap-2">
            <IoAddOutline className="w-4 h-4" />
            Nuevo cupón
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-kyzz-secondary mb-8">
        {(["coupons", "log"] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); setCreating(false); setEditing(null); }}
            className={`text-[10px] tracking-[0.25em] uppercase px-5 py-3 transition-colors ${
              tab === t
                ? "text-kyzz-dark border-b-2 border-kyzz-dark -mb-px"
                : "text-kyzz-muted hover:text-kyzz-dark"
            }`}>
            {t === "coupons" ? `Cupones (${initialCoupons.length})` : `Uso / Log (${initialRedemptions.length})`}
          </button>
        ))}
      </div>

      {/* ── TAB: Cupones ─────────────────────────────────── */}
      {tab === "coupons" && (
        <>
          {(creating || editing) && (
            <div className="kyzz-panel mb-8">
              <h2 className={`${titleFont.className} text-xl font-normal text-kyzz-dark mb-6`}>
                {editing ? `Editar — ${editing.code}` : "Nuevo cupón"}
              </h2>
              <CouponForm coupon={editing ?? undefined} onDone={handleDone} />
            </div>
          )}

          {initialCoupons.length === 0 ? (
            <div className="kyzz-panel text-center py-16">
              <p className="text-[11px] tracking-widest uppercase text-kyzz-muted">No hay cupones creados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-kyzz-secondary">
                    {["Código", "Campaña", "Tipo", "Valor", "Usos", "Activo", "Expiración", ""].map((h) => (
                      <th key={h} className="text-left text-[9px] tracking-[0.3em] uppercase text-kyzz-muted py-3 pr-5 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-kyzz-secondary/50">
                  {initialCoupons.map((c) => {
                    const expired = c.expiresAt && c.expiresAt < now;
                    return (
                      <tr key={c.id} className="hover:bg-kyzz-tertiary/40 transition-colors">
                        <td className="py-4 pr-5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[13px] text-kyzz-dark tracking-wider">{c.code}</span>
                            {c.subscriberOnly && (
                              <span className="text-[8px] tracking-widest uppercase text-kyzz-primary border border-kyzz-primary/30 px-1.5 py-0.5">Newsletter</span>
                            )}
                          </div>
                          {c.description && (
                            <p className="text-[10px] text-kyzz-muted mt-0.5">{c.description}</p>
                          )}
                        </td>
                        <td className="py-4 pr-5">
                          <span className="text-[10px] tracking-widest uppercase text-kyzz-muted">
                            {CAMPAIGN_LABELS[c.campaign]}
                          </span>
                        </td>
                        <td className="py-4 pr-5 text-[11px] text-kyzz-muted">
                          {c.type === CouponType.PERCENTAGE ? "%" : "Fijo"}
                        </td>
                        <td className="py-4 pr-5 text-[13px] text-kyzz-dark">
                          {c.type === CouponType.PERCENTAGE ? `${c.value}%` : currencyFormat(c.value)}
                        </td>
                        <td className="py-4 pr-5 text-[11px] text-kyzz-muted">
                          {c._count.redemptions}
                          {c.usageLimit !== null && <span className="text-kyzz-secondary"> / {c.usageLimit}</span>}
                        </td>
                        <td className="py-4 pr-5">
                          <span className={`inline-block w-2 h-2 rounded-full ${c.isActive && !expired ? "bg-emerald-400" : "bg-kyzz-secondary"}`} />
                        </td>
                        <td className="py-4 pr-5 text-[11px] text-kyzz-muted">
                          {c.expiresAt
                            ? <span className={expired ? "text-red-400" : ""}>{new Date(c.expiresAt).toLocaleDateString("es-CO")}</span>
                            : "—"}
                        </td>
                        <td className="py-4">
                          <button onClick={() => { setCreating(false); setEditing(c); }}
                            className="text-kyzz-muted hover:text-kyzz-dark transition-colors" aria-label="Editar">
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
        </>
      )}

      {/* ── TAB: Log de redenciones ──────────────────────── */}
      {tab === "log" && (
        <>
          {initialRedemptions.length === 0 ? (
            <div className="kyzz-panel text-center py-16">
              <p className="text-[11px] tracking-widest uppercase text-kyzz-muted">Ningún cupón usado aún</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-kyzz-secondary">
                    {["Fecha", "Email", "Código", "Descuento", "Orden", "Pagado"].map((h) => (
                      <th key={h} className="text-left text-[9px] tracking-[0.3em] uppercase text-kyzz-muted py-3 pr-5 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-kyzz-secondary/50">
                  {initialRedemptions.map((r) => (
                    <tr key={r.id} className="hover:bg-kyzz-tertiary/40 transition-colors">
                      <td className="py-3.5 pr-5 text-[11px] text-kyzz-muted whitespace-nowrap">
                        {new Date(r.redeemedAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="py-3.5 pr-5 text-[12px] text-kyzz-dark">{r.email}</td>
                      <td className="py-3.5 pr-5">
                        <span className="font-mono text-[12px] text-kyzz-dark tracking-wider">{r.coupon.code}</span>
                        <span className="ml-1.5 text-[10px] text-kyzz-muted">
                          {r.coupon.type === CouponType.PERCENTAGE ? `${r.coupon.value}%` : currencyFormat(r.coupon.value)}
                        </span>
                      </td>
                      <td className="py-3.5 pr-5 text-[13px] text-kyzz-primary">
                        {r.order ? `−${currencyFormat(r.order.couponDiscount)}` : "—"}
                      </td>
                      <td className="py-3.5 pr-5">
                        {r.order ? (
                          <Link href={`/admin/orders/${r.order.id}`}
                            className="text-[10px] font-mono tracking-wider text-kyzz-muted hover:text-kyzz-dark transition-colors underline">
                            #{r.order.id.split("-").at(-1)?.toUpperCase()}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="py-3.5">
                        {r.order ? (
                          <span className={`inline-block w-2 h-2 rounded-full ${r.order.isPaid ? "bg-emerald-400" : "bg-amber-400"}`} />
                        ) : (
                          <span className="inline-block w-2 h-2 rounded-full bg-kyzz-secondary" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
