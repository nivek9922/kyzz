'use client';

// global-error reemplaza el RootLayout completo cuando hay un error en él,
// por eso renderiza su propio <html>/<body> y usa estilos inline (sin Tailwind/fuentes del layout).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF9F6',
          color: '#3D2B1F',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <p style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#A89080', margin: 0 }}>
          KYZZ
        </p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, margin: '1rem 0 0.5rem' }}>
          Algo salió mal
        </h1>
        <p style={{ fontSize: 14, color: '#A89080', maxWidth: 420, lineHeight: 1.6 }}>
          Ocurrió un error inesperado. Por favor intenta de nuevo; si el problema persiste, escríbenos.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 2rem',
            fontSize: 11,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#fff',
            background: '#8C7365',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
