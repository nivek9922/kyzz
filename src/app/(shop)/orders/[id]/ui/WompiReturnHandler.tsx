'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { wompiCheckPayment } from '@/actions';

interface Props {
  orderId: string;
  isPaid:  boolean;
}

/**
 * Procesa el retorno de Wompi tras un pago. Cuando el método requiere salir
 * del modal (PSE, Nequi, Bancolombia, 3DS de tarjeta), Wompi redirige al
 * `redirectUrl` con `?id=<transactionId>` y el callback del widget no se
 * dispara. Este handler detecta ese parámetro y verifica el pago server-side.
 */
export const WompiReturnHandler = ({ orderId, isPaid }: Props) => {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const processedRef  = useRef(false);
  const transactionId = searchParams.get('id');

  useEffect(() => {
    if (!transactionId || processedRef.current) return;

    if (isPaid) {
      router.replace(`/orders/${orderId}`);
      return;
    }

    processedRef.current = true;
    const toastId = toast.loading('Verificando pago...');

    wompiCheckPayment(transactionId, orderId).then((result) => {
      if (result.ok) {
        toast.success('¡Pago confirmado!', {
          id:          toastId,
          description: 'Tu pedido está siendo procesado.',
        });
        router.replace(`/orders/${orderId}`);
        router.refresh();
      } else {
        toast.error(result.message ?? 'No se pudo verificar el pago', {
          id:          toastId,
          description: 'Si el cargo fue realizado, contacta soporte.',
          duration:    8000,
        });
      }
    });
  }, [transactionId, isPaid, orderId, router]);

  return null;
};
