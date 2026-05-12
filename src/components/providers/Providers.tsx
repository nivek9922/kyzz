"use client";

import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

interface Props {
  children: React.ReactNode;
}

export const Providers = ({ children }: Props) => {
  return (
    <PayPalScriptProvider options={{
      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? 'sb',
      intent:   'capture',
      currency: process.env.NEXT_PUBLIC_PAYPAL_CURRENCY ?? 'USD',
    }}>
      <SessionProvider>
        {children}
        <Toaster
          position="top-right"
          gap={8}
          toastOptions={{
            style: {
              background: '#FAF9F6',
              color: '#3D2B1F',
              border: '1px solid #E3D5CA',
              borderRadius: '0px',
              fontSize: '11px',
              letterSpacing: '0.06em',
              fontFamily: 'inherit',
              padding: '14px 18px',
              boxShadow: '0 4px 24px rgba(61,43,31,0.08)',
            },
            classNames: {
              title: 'tracking-wide',
              description: 'text-[#A89080]',
            },
          }}
        />
      </SessionProvider>
    </PayPalScriptProvider>
  );
};
