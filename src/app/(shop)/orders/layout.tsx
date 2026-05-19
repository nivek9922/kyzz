import { PayPalProviders } from '@/components/providers/PayPalProviders';

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return (
    <PayPalProviders>
      {children}
    </PayPalProviders>
  );
}
