import type { Metadata } from "next";
import { notoSerif, manrope } from "@/config/fonts";

import "./globals.css";
import { Providers } from "@/components";

export const metadata: Metadata = {
  title: {
    template: "%s | KYZZ",
    default: "KYZZ — Basics for every you",
  },
  description: "Básicos que te acompañan todos los días. Calidad premium, diseño atemporal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${notoSerif.variable} ${manrope.variable}`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
