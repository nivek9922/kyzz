"use client";

import { useEffect, useRef, useState } from "react";
import { IoCloseOutline } from "react-icons/io5";
import { toast } from "sonner";
import { titleFont } from "@/config/fonts";
import { subscribeNewsletter } from "@/actions/site/subscribe-newsletter";

const STORAGE_KEY = "kyzz-newsletter-popup";
const DELAY_MS = 8000;
const DISCOUNT_CODE = "KYZZ10";

export const NewsletterPopup = () => {
  const [open, setOpen]         = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (open && !subscribed) inputRef.current?.focus();
  }, [open, subscribed]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setOpen(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const result = await subscribeNewsletter(email);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    localStorage.setItem(STORAGE_KEY, "subscribed");
    setSubscribed(true);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Suscripción al newsletter"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-kyzz-dark/40 backdrop-blur-[2px]"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fade-in relative w-full max-w-md bg-kyzz-neutral border border-kyzz-secondary shadow-2xl">

        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-kyzz-muted hover:text-kyzz-dark transition-colors"
          aria-label="Cerrar"
        >
          <IoCloseOutline className="w-5 h-5" />
        </button>

        <div className="p-10">
          {subscribed ? (
            /* ── Estado: suscrito ── */
            <div className="text-center space-y-5">
              <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-primary">
                Bienvenida a KYZZ
              </p>
              <h2 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark leading-snug`}>
                Tu código de descuento
              </h2>
              <div className="border border-kyzz-secondary py-4 px-6 inline-block">
                <span className={`${titleFont.className} text-2xl tracking-[0.3em] text-kyzz-dark`}>
                  {DISCOUNT_CODE}
                </span>
              </div>
              <p className="text-[11px] text-kyzz-muted leading-relaxed">
                Aplica este código en tu próxima compra y obtén un{" "}
                <span className="text-kyzz-dark font-medium">10% de descuento</span>.
              </p>
              <button onClick={dismiss} className="btn-primary w-full mt-2">
                Continuar comprando
              </button>
            </div>
          ) : (
            /* ── Estado: formulario ── */
            <>
              <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-primary mb-4">
                Exclusivo para suscriptoras
              </p>
              <h2 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark leading-snug mb-3`}>
                10% de descuento
                <br />
                en tu primera compra
              </h2>
              <p className="text-[11px] text-kyzz-muted leading-relaxed mb-7">
                Suscríbete y recibe acceso anticipado a nuevas colecciones,
                ediciones especiales y ofertas exclusivas.
              </p>

              <form onSubmit={onSubmit} className="space-y-3">
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu correo electrónico"
                  required
                  className="w-full border border-kyzz-secondary bg-transparent px-4 py-3 text-[12px] text-kyzz-dark placeholder:text-kyzz-muted focus:outline-none focus:border-kyzz-dark transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${loading ? "btn-disabled" : "btn-primary"}`}
                >
                  {loading ? "Suscribiendo..." : "Obtener mi descuento"}
                </button>
              </form>

              <button
                onClick={dismiss}
                className="w-full mt-3 text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-dark transition-colors py-1"
              >
                No gracias
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
