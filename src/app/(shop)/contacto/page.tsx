'use client';

import { useActionState, useState, useEffect } from 'react';
import { titleFont } from '@/config/fonts';
import { sendContactMessage, type ContactState } from '@/actions/contact/send-contact-message';

const SUBJECTS = [
  'Consulta sobre un producto',
  'Estado de mi pedido',
  'Devoluciones y cambios',
  'Problema con mi cuenta',
  'Otro',
];

export default function ContactPage() {
  const [state, dispatch, isPending] = useActionState<ContactState, FormData>(
    sendContactMessage,
    null,
  );
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (state?.status === 'success') setShowSuccess(true);
  }, [state?.status]);

  return (
    <main className="max-w-2xl mx-auto px-6 py-20">

      {/* Cabecera */}
      <div className="mb-12">
        <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-3">
          Estamos para ti
        </p>
        <h1 className={`${titleFont.className} text-4xl font-normal text-kyzz-dark mb-4`}>
          Contacto
        </h1>
        <div className="w-8 h-px bg-kyzz-secondary" />
      </div>

      {showSuccess ? (
        <div className="kyzz-panel p-8 text-center space-y-3">
          <p className="text-kyzz-primary text-xl">✦</p>
          <p className={`${titleFont.className} text-xl text-kyzz-dark`}>
            Mensaje enviado
          </p>
          <p className="text-sm text-kyzz-muted leading-relaxed">
            Gracias por escribirnos. Te responderemos en menos de 24 horas.
          </p>
          <button
            onClick={() => setShowSuccess(false)}
            className="mt-4 text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
          >
            Enviar otro mensaje
          </button>
        </div>
      ) : (
        <form action={dispatch} className="space-y-8" noValidate>

          {/* Nombre */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">
              Nombre
            </label>
            <input
              type="text"
              name="name"
              autoComplete="name"
              className="kyzz-input"
              disabled={isPending}
            />
            {state?.fieldErrors?.name && (
              <p className="text-xs text-red-500 mt-1">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">
              Correo electrónico
            </label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              className="kyzz-input"
              disabled={isPending}
            />
            {state?.fieldErrors?.email && (
              <p className="text-xs text-red-500 mt-1">{state.fieldErrors.email[0]}</p>
            )}
          </div>

          {/* Asunto */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">
              Asunto
            </label>
            <select
              name="subject"
              defaultValue=""
              className="kyzz-input bg-transparent cursor-pointer"
              disabled={isPending}
            >
              <option value="" disabled>Selecciona un asunto...</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {state?.fieldErrors?.subject && (
              <p className="text-xs text-red-500 mt-1">{state.fieldErrors.subject[0]}</p>
            )}
          </div>

          {/* Mensaje */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">
              Mensaje
            </label>
            <textarea
              name="message"
              rows={5}
              className="kyzz-input resize-none"
              disabled={isPending}
            />
            {state?.fieldErrors?.message && (
              <p className="text-xs text-red-500 mt-1">{state.fieldErrors.message[0]}</p>
            )}
          </div>

          {/* Error de servidor */}
          {state?.status === 'error' && (
            <p className="text-sm text-red-500">{state.message}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Enviando...' : 'Enviar mensaje'}
          </button>

        </form>
      )}

      {/* Info adicional */}
      <div className="mt-16 pt-10 border-t border-kyzz-secondary grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div>
          <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted mb-2">Email</p>
          <p className="text-sm text-kyzz-dark">hola@kyzz.co</p>
        </div>
        <div>
          <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted mb-2">Respuesta</p>
          <p className="text-sm text-kyzz-dark">En menos de 24 horas</p>
        </div>
      </div>

    </main>
  );
}
