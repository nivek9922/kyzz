'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { toast } from 'sonner';
import { wompiCreatePayment, wompiCheckPayment } from '@/actions';

// ── Tipos del Widget de Wompi ─────────────────────────────────────────────────
declare global {
  interface Window {
    WidgetCheckout?: new (config: WompiWidgetConfig) => WompiWidget;
  }
}

interface WompiWidgetConfig {
  currency:        'COP';
  amountInCents:   number;
  reference:       string;
  publicKey:       string;
  redirectUrl:     string;
  signature:       { integrity: string };
  customerData?: {
    email?:               string;
    fullName?:            string;
    phoneNumber?:         string;
    phoneNumberPrefix?:   string;
    legalId?:             string;
    legalIdType?:         string;
  };
}

interface WompiWidget {
  open: (callback: (result: WompiWidgetResult) => void) => void;
}

interface WompiWidgetResult {
  transaction: {
    id:        string;
    status:    'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED' | 'PENDING';
    reference: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  orderId: string;
  amount:  number;
  email?:  string | null;
}

const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;

export const WompiButton = ({ orderId, amount, email }: Props) => {
  const router          = useRouter();
  const [ready,   setReady]   = useState(false);
  const [loading, setLoading] = useState(false);

  // Si el script ya estaba cargado de una visita anterior (navegación SPA),
  // window.WidgetCheckout ya existe y onLoad no vuelve a dispararse.
  useEffect(() => {
    if (window.WidgetCheckout) setReady(true);
  }, []);

  // Wompi trabaja en centavos de COP
  const amountInCents = Math.round(amount * 100);

  if (!WOMPI_PUBLIC_KEY) {
    return (
      <div className="w-full py-4 px-6 border border-kyzz-secondary bg-kyzz-tertiary text-center">
        <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted">
          Procesador no disponible
        </p>
      </div>
    );
  }

  const handlePay = async () => {
    if (!window.WidgetCheckout) {
      toast.error('Procesador de pagos no disponible', {
        description: 'Recarga la página e intenta de nuevo.',
      });
      return;
    }

    setLoading(true);

    // NEXT_PUBLIC_APP_URL permite sobrescribir el origen en dev (ej. ngrok).
    // Wompi WAF bloquea con 403 cuando redirect-url apunta a localhost + integrity.
    const appOrigin  = (process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin).replace(/\/$/, '');
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(appOrigin);

    if (isLocalhost) {
      toast.error('Wompi requiere un dominio público', {
        description: 'Agrega NEXT_PUBLIC_APP_URL=https://xxx.ngrok-free.app en .env y reinicia el servidor.',
        duration:    12_000,
      });
      setLoading(false);
      return;
    }

    const { ok, integrity, reference, message } = await wompiCreatePayment(orderId, amountInCents);
    if (!ok || !integrity || !reference) {
      toast.error(message ?? 'No se pudo iniciar el pago');
      setLoading(false);
      return;
    }

    const safetyTimer = setTimeout(() => setLoading(false), 90_000);

    // Detectar cierre del widget sin transacción — el callback no dispara si el
    // usuario cierra el overlay antes de iniciar ningún pago. Hacemos polling
    // buscando el iframe de Wompi: cuando aparece y luego desaparece = fue cerrado.
    let callbackFired = false;
    let widgetSeen    = false;
    const pollId      = setInterval(() => {
      const frame = document.querySelector('iframe[src*="checkout.wompi"]');
      if (frame) {
        widgetSeen = true;
      } else if (widgetSeen && !callbackFired) {
        clearInterval(pollId);
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    }, 250);

    const checkout = new window.WidgetCheckout({
      currency:      'COP',
      amountInCents,
      reference,
      publicKey:     WOMPI_PUBLIC_KEY,
      redirectUrl:   `${appOrigin}/orders/${orderId}`,
      signature:     { integrity },
      ...(email ? { customerData: { email } } : {}),
    });

    checkout.open(async ({ transaction }) => {
      callbackFired = true;
      clearInterval(pollId);
      clearTimeout(safetyTimer);
      setLoading(false);

      if (transaction.status === 'APPROVED') {
        const toastId = toast.loading('Verificando pago...');
        const result  = await wompiCheckPayment(transaction.id, orderId);
        if (result.ok) {
          toast.success('¡Pago confirmado!', {
            id:          toastId,
            description: 'Tu pedido está siendo procesado.',
          });
          router.refresh();
        } else {
          toast.error('No se pudo verificar el pago', {
            id:          toastId,
            description: 'Si el cargo fue realizado, contacta soporte.',
            duration:    8000,
          });
        }
      } else if (transaction.status === 'PENDING') {
        toast.info('Pago en proceso', {
          description: 'Te notificaremos por email cuando se confirme.',
          duration:    7000,
        });
        router.refresh();
      } else if (transaction.status === 'DECLINED') {
        toast.error('Pago rechazado', {
          description: 'Verifica los datos de tu tarjeta o intenta con otro método.',
        });
      } else {
        toast.error('El pago no fue completado');
      }
    });
  };

  return (
    <>
      <Script
        src="https://checkout.wompi.co/widget.js"
        strategy="lazyOnload"
        onLoad={()  => setReady(true)}
        onError={() => toast.error('No se pudo cargar el procesador de pagos')}
      />

      <button
        onClick={handlePay}
        disabled={loading || !ready}
        className={`w-full flex items-center justify-center gap-2.5 py-4 px-6 border transition-all text-[11px] tracking-[0.2em] uppercase font-medium ${
          loading || !ready
            ? 'opacity-60 cursor-not-allowed bg-kyzz-tertiary border-kyzz-secondary text-kyzz-muted'
            : 'bg-kyzz-dark border-kyzz-dark text-white hover:bg-kyzz-primary hover:border-kyzz-primary'
        }`}
      >
        {loading ? (
          <>
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
            Procesando...
          </>
        ) : !ready ? (
          'Cargando...'
        ) : (
          'Pagar con Wompi'
        )}
      </button>

      {ready && (
        <p className="text-[10px] text-kyzz-muted text-center mt-2 tracking-widest">
          Tarjeta · PSE · Nequi · DaviPlata · Bancolombia
        </p>
      )}
    </>
  );
};
