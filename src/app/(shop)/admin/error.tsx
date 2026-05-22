'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { titleFont } from '@/config/fonts';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[AdminError]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <p className={`${titleFont.className} text-7xl text-kyzz-secondary mb-6`}>500</p>

      <h1 className={`${titleFont.className} text-xl text-kyzz-dark mb-3`}>
        Error en el panel
      </h1>

      <p className="text-kyzz-muted text-sm max-w-xs mb-10 leading-relaxed">
        Ocurrió un error inesperado. Puedes intentar recargar la sección o regresar al dashboard.
      </p>

      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-kyzz-dark text-white text-xs tracking-widest uppercase hover:bg-kyzz-primary transition-colors"
        >
          Reintentar
        </button>

        <Link
          href="/admin"
          className="px-6 py-2.5 border border-kyzz-dark text-kyzz-dark text-xs tracking-widest uppercase hover:bg-kyzz-tertiary transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
