"use client";

import dynamic from 'next/dynamic';
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { AnalyticsUser } from "@/components/analytics/AnalyticsUser";
import { WishlistSync } from "@/components/analytics/WishlistSync";

const NewsletterPopup = dynamic(
  () => import('@/components/ui/NewsletterPopup').then((m) => ({ default: m.NewsletterPopup })),
  { ssr: false },
);

interface Props {
  children: React.ReactNode;
}

export const Providers = ({ children }: Props) => {
  return (
    <SessionProvider>
      {children}
      <AnalyticsUser />
      <WishlistSync />
      <NewsletterPopup />
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
  );
};
