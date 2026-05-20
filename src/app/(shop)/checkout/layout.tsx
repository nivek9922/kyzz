import { CheckoutProviders } from './CheckoutProviders';

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <CheckoutProviders>
      {children}
    </CheckoutProviders>
  );
}