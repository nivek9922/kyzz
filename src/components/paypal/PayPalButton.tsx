'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { CreateOrderData, CreateOrderActions, OnApproveData } from '@paypal/paypal-js';
import { toast } from 'sonner';
import { paypalCheckPayment, setTransactionId, verifyExistingPaypalPayment } from '@/actions';

interface Props {
  orderId: string;
  amount:  number;
}

export const PayPalButton = ({ orderId, amount }: Props) => {
  const router         = useRouter();
  const errorShownRef  = useRef(false);
  const [{ isPending }] = usePayPalScriptReducer();

  const roundedAmount = Math.round(amount * 100) / 100;

  if (isPending) {
    return (
      <div className="animate-pulse space-y-2 mb-4">
        <div className="h-11 bg-kyzz-tertiary border border-kyzz-secondary" />
        <div className="h-11 bg-kyzz-tertiary border border-kyzz-secondary" />
      </div>
    );
  }

  const createOrder = async (_data: CreateOrderData, actions: CreateOrderActions): Promise<string> => {
    const transactionId = await actions.order.create({
      intent: 'CAPTURE',
      purchase_units: [{
        invoice_id: orderId,
        amount: {
          currency_code: process.env.NEXT_PUBLIC_PAYPAL_CURRENCY ?? 'USD',
          value: `${roundedAmount}`,
        },
      }],
    });

    const { ok } = await setTransactionId(orderId, transactionId);
    if (!ok) throw new Error('No se pudo registrar la transacción');

    return transactionId;
  };

  const onApprove = async (data: OnApproveData) => {
    const toastId = toast.loading('Verificando pago...');
    try {
      const result = await paypalCheckPayment(data.orderID);
      if (!result.ok) throw new Error(result.message ?? 'Verificación fallida');

      toast.success('¡Pago confirmado!', {
        id: toastId,
        description: 'Tu pedido ha sido pagado exitosamente.',
      });
      router.refresh();
    } catch (err) {
      console.error('[PayPal] onApprove error:', err);
      toast.error('No se pudo confirmar el pago', {
        id: toastId,
        description: err instanceof Error ? err.message : 'Intenta de nuevo o contacta soporte.',
      });
    }
  };

  const onError = async () => {
    if (errorShownRef.current) return;
    errorShownRef.current = true;

    // Intenta recuperar si ya existe un pago capturado (ej: DUPLICATE_INVOICE_ID)
    const recovery = await verifyExistingPaypalPayment(orderId);
    if (recovery.ok) {
      toast.success('¡Pago confirmado!', {
        description: 'Tu pedido ha sido pagado exitosamente.',
      });
      router.refresh();
      errorShownRef.current = false;
      return;
    }

    toast.error('Error al procesar el pago con PayPal.');
    setTimeout(() => { errorShownRef.current = false; }, 3000);
  };

  return (
    <div className="relative z-0">
      <PayPalButtons
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onError}
        style={{ layout: 'vertical', shape: 'rect', label: 'pay' }}
      />
    </div>
  );
};