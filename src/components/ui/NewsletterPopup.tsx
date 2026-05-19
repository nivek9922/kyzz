"use client";

import { useEffect, useRef, useState } from "react";
import { IoCloseOutline } from "react-icons/io5";
import { titleFont } from "@/config/fonts";
import { subscribeNewsletter } from "@/actions/site/subscribe-newsletter";

const STORAGE_KEY    = "kyzz-newsletter-popup";
const DELAY_MS       = 8000;
const DISCOUNT_CODE  = "KYZZ10";

type Stage       = "form" | "success";
type FormErrors  = { name?: string; email?: string };

export const NewsletterPopup = () => {
  /* ── Visibility ──────────────────────────────────── */
  const [open,    setOpen]    = useState(false);
  const [visible, setVisible] = useState(false);   // drives CSS transition

  /* ── Form ───────────────────────────────────────── */
  const [stage,   setStage]   = useState<Stage>("form");
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [errors,  setErrors]  = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  /* ── Success ────────────────────────────────────── */
  const [copied,  setCopied]  = useState(false);

  const triggered   = useRef(false);
  const closeTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* Open: mount → next frame → visible (CSS transition in) */
  const show = () => {
    if (triggered.current) return;
    triggered.current = true;
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };

  /* Dismiss: visible=false → wait for transition → unmount */
  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setVisible(false);
    closeTimer.current = setTimeout(() => setOpen(false), 300);
  };

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(show, DELAY_MS);

    /* Exit intent — desktop only */
    const onMouseLeave = (e: MouseEvent) => { if (e.clientY <= 0) show(); };
    document.documentElement.addEventListener("mouseleave", onMouseLeave);

    return () => {
      clearTimeout(timer);
      clearTimeout(closeTimer.current);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Validation ─────────────────────────────────── */
  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!name.trim())  next.name  = "Ingresa tu nombre";
    if (!email.trim()) next.email = "Ingresa tu correo electrónico";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "El correo no es válido";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await subscribeNewsletter(email.trim().toLowerCase(), name.trim() || undefined);
    setLoading(false);

    if (!result.ok && result.message !== "Este correo ya está suscrito.") {
      setErrors({ email: result.message });
      return;
    }
    localStorage.setItem(STORAGE_KEY, "subscribed");
    setStage("success");
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(DISCOUNT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  if (!open) return null;

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Suscripción al newsletter KYZZ"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-kyzz-dark/50 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative w-full md:max-w-[740px] flex flex-col md:flex-row overflow-hidden
                   transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                   md:max-h-[90vh]"
        style={{
          opacity:   visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
        }}
      >
        {/* ── LEFT — Editorial panel (solo desktop) ────────── */}
        <div className="hidden md:flex w-[42%] bg-kyzz-dark flex-col justify-between p-10 relative overflow-hidden select-none shrink-0">
          {/* Fondo decorativo */}
          <span
            aria-hidden="true"
            className={`${titleFont.className} absolute inset-0 flex items-center justify-center text-[160px] leading-none text-white/[0.035] tracking-widest pointer-events-none`}
          >
            K
          </span>

          {/* Wordmark */}
          <div className="relative z-10">
            <span className={`${titleFont.className} text-white/90 text-base tracking-[0.4em] uppercase`}>
              KYZZ
            </span>
          </div>

          {/* Oferta central */}
          <div className="relative z-10">
            <p className="text-white/40 text-[9px] tracking-[0.35em] uppercase mb-4">
              Solo para suscriptoras
            </p>
            <p className={`${titleFont.className} text-white text-[80px] leading-none font-normal`}>
              10%
            </p>
            <div className="w-8 h-px bg-white/30 my-3" />
            <p className="text-white/60 text-[10px] tracking-[0.28em] uppercase">
              de descuento
            </p>
          </div>

          {/* Tagline */}
          <div className="relative z-10">
            <p className="text-white/25 text-[9px] tracking-[0.22em] uppercase">
              Basics for every you
            </p>
          </div>
        </div>

        {/* ── RIGHT — Contenido ────────────────────────────── */}
        <div className="flex-1 bg-kyzz-neutral flex flex-col overflow-y-auto max-h-[90vh] md:max-h-none">

          {/* Banda mobile (solo mobile) */}
          <div className="md:hidden bg-kyzz-dark px-7 py-5 flex items-center justify-between shrink-0">
            <span className={`${titleFont.className} text-white/90 text-sm tracking-[0.35em] uppercase`}>
              KYZZ
            </span>
            <span className="text-white/50 text-[9px] tracking-[0.3em] uppercase">
              10% descuento
            </span>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={dismiss}
            className="absolute top-3.5 right-4 z-20 w-8 h-8 flex items-center justify-center
                       text-white/70 md:text-kyzz-muted hover:text-white md:hover:text-kyzz-dark
                       transition-colors"
            aria-label="Cerrar"
          >
            <IoCloseOutline className="w-5 h-5" />
          </button>

          <div className="px-8 md:px-10 py-8 md:py-10 flex-1">
            {stage === "form" ? (
              <div>
                {/* Heading */}
                <p className="text-[9px] tracking-[0.35em] uppercase text-kyzz-primary mb-3">
                  Comunidad exclusiva
                </p>
                <h2 className={`${titleFont.className} text-[26px] md:text-[30px] font-normal text-kyzz-dark leading-[1.2] mb-3`}>
                  Tu primera compra,
                  <br />
                  con descuento.
                </h2>
                <p className="text-[11px] text-kyzz-muted leading-relaxed mb-7 max-w-xs">
                  Únete y recibe acceso anticipado a nuevas colecciones,
                  drops exclusivos y beneficios especiales.
                </p>

                {/* Form */}
                <form onSubmit={onSubmit} noValidate className="space-y-5">
                  <div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                      }}
                      placeholder="Nombre"
                      autoComplete="given-name"
                      className={`kyzz-input ${errors.name ? "border-b-red-400 focus:border-b-red-400" : ""}`}
                    />
                    {errors.name && (
                      <p className="mt-1.5 text-[10px] text-red-500 tracking-wide">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                      }}
                      placeholder="Correo electrónico"
                      autoComplete="email"
                      className={`kyzz-input ${errors.email ? "border-b-red-400 focus:border-b-red-400" : ""}`}
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-[10px] text-red-500 tracking-wide">{errors.email}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full inline-flex items-center justify-center mt-2 ${loading ? "btn-disabled" : "btn-primary"}`}
                  >
                    {loading ? "Registrando..." : "Obtener mi descuento"}
                  </button>
                </form>

                <button
                  onClick={dismiss}
                  className="w-full mt-4 text-[10px] tracking-widest uppercase text-kyzz-muted
                             hover:text-kyzz-dark transition-colors py-1"
                >
                  No gracias
                </button>
              </div>
            ) : (
              /* ── Success ───────────────────────────────── */
              <div className="flex flex-col items-center text-center space-y-5 pt-2">
                {/* Check */}
                <div className="w-10 h-10 border border-kyzz-primary flex items-center justify-center">
                  <svg className="w-4 h-4 text-kyzz-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div>
                  <p className="text-[9px] tracking-[0.35em] uppercase text-kyzz-primary mb-2">
                    {name.trim() ? `Bienvenida, ${name.trim().split(" ")[0]}` : "Bienvenida a KYZZ"}
                  </p>
                  <h2 className={`${titleFont.className} text-2xl font-normal text-kyzz-dark`}>
                    Tu código de descuento
                  </h2>
                </div>

                {/* Código */}
                <button
                  onClick={copyCode}
                  className="w-full border border-kyzz-secondary py-5 px-6 flex flex-col items-center gap-2
                             hover:border-kyzz-primary transition-colors group"
                  aria-label={`Copiar código ${DISCOUNT_CODE}`}
                >
                  <span className={`${titleFont.className} text-[32px] tracking-[0.4em] text-kyzz-dark`}>
                    {DISCOUNT_CODE}
                  </span>
                  <span className="text-[9px] tracking-[0.3em] uppercase text-kyzz-muted group-hover:text-kyzz-primary transition-colors">
                    {copied ? "Copiado ✓" : "Toca para copiar"}
                  </span>
                </button>

                <p className="text-[11px] text-kyzz-muted leading-relaxed max-w-xs">
                  Aplica el código al finalizar tu compra y obtén un{" "}
                  <span className="text-kyzz-dark font-medium">10% de descuento</span>.
                </p>

                <button onClick={dismiss} className="btn-primary w-full">
                  Continuar comprando
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
