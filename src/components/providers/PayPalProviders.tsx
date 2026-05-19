"use client";

import { PayPalScriptProvider } from '@paypal/react-paypal-js';

export const PayPalProviders = ({ children }: { children: React.ReactNode }) => (
  <PayPalScriptProvider options={{
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? 'sb',
    intent:   'capture',
    currency: process.env.NEXT_PUBLIC_PAYPAL_CURRENCY ?? 'USD',
  }}>
    {children}
  </PayPalScriptProvider>
);
