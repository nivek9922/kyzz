'use client';

import { useState } from 'react';
import { titleFont } from '@/config/fonts';

const SUBJECTS = [
  'Consulta sobre un producto',
  'Estado de mi pedido',
  'Devoluciones y cambios',
  'Problema con mi cuenta',
  'Otro',
];

interface FormState {
  name:    string;
  email:   string;
  subject: string;
  message: string;
}

interface FieldErrors {
  name?:    string[];
  email?:   string[];
  subject?: string[];
  message?: string[];
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', subject: '', message: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [serverError, setServerError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setServerError('');
    setFieldErrors({});

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data.errors) {
          setFieldErrors(data.errors);
          setStatus('idle');
        } else {
          setServerError(data.message ?? 'Error al enviar el mensaje');
          setStatus('error');
        }
        return;
      }

      setStatus('success');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setServerError('No se pudo conectar con el servidor. Intenta de nuevo.');
      setStatus('error');
    }
  };

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

      {status === 'success' ? (
        <div className="kyzz-panel p-8 text-center space-y-3">
          <p className="text-kyzz-primary text-xl">✦</p>
          <p className={`${titleFont.className} text-xl text-kyzz-dark`}>
            Mensaje enviado
          </p>
          <p className="text-sm text-kyzz-muted leading-relaxed">
            Gracias por escribirnos. Te responderemos en menos de 24 horas.
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="mt-4 text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
          >
            Enviar otro mensaje
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8" noValidate>

          {/* Nombre */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">
              Nombre
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              className="kyzz-input"
              disabled={status === 'loading'}
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.name[0]}</p>
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
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              className="kyzz-input"
              disabled={status === 'loading'}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.email[0]}</p>
            )}
          </div>

          {/* Asunto */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">
              Asunto
            </label>
            <select
              name="subject"
              value={form.subject}
              onChange={handleChange}
              className="kyzz-input bg-transparent cursor-pointer"
              disabled={status === 'loading'}
            >
              <option value="" disabled>Selecciona un asunto...</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {fieldErrors.subject && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.subject[0]}</p>
            )}
          </div>

          {/* Mensaje */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">
              Mensaje
            </label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={5}
              className="kyzz-input resize-none"
              disabled={status === 'loading'}
            />
            {fieldErrors.message && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.message[0]}</p>
            )}
          </div>

          {/* Error de servidor */}
          {status === 'error' && (
            <p className="text-sm text-red-500">{serverError}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Enviando...' : 'Enviar mensaje'}
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
