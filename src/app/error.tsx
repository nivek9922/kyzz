'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { titleFont } from '@/config/fonts';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <p className={`${titleFont.className} text-8xl text-kyzz-secondary mb-6`}>500</p>

      <h1 className={`${titleFont.className} text-2xl text-kyzz-dark mb-3`}>
        Algo salió mal
      </h1>

      <p className="text-kyzz-muted text-sm max-w-xs mb-10 leading-relaxed">
        Ocurrió un error inesperado. Puedes intentar de nuevo o regresar al inicio.
      </p>

      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-8 py-3 bg-kyzz-dark text-white text-xs tracking-widest uppercase hover:bg-kyzz-primary transition-colors"
        >
          Intentar de nuevo
        </button>

        <Link
          href="/"
          className="px-8 py-3 border border-kyzz-dark text-kyzz-dark text-xs tracking-widest uppercase hover:bg-kyzz-tertiary transition-colors"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
