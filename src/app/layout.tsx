import type { Metadata } from "next";
import { notoSerif, manrope } from "@/config/fonts";
import { GoogleAnalytics } from "@next/third-parties/google";

import "./globals.css";
import { Providers } from "@/components";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: "%s | KYZZ",
    default: "KYZZ — Basics for every you",
  },
  description: "Básicos que te acompañan todos los días. Calidad premium, diseño atemporal.",
  openGraph: {
    siteName: 'KYZZ',
    locale: 'es_CO',
    type: 'website',
  },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${notoSerif.variable} ${manrope.variable}`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
        {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      </body>
    </html>
  );
}
