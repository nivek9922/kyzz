import { Noto_Serif, Manrope } from 'next/font/google';

export const notoSerif = Noto_Serif({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-noto-serif',
});

export const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-manrope',
});

// Alias para compatibilidad con componentes que usan titleFont
export const inter = manrope;
export const titleFont = notoSerif;