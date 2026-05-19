import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CheckoutProviders } from './CheckoutProviders';

export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login?redirectTo=/checkout/address");
  }

  return (
    <CheckoutProviders>
      {children}
    </CheckoutProviders>
  );
}