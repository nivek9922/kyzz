import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

const WOMPI_DOMAINS      = 'https://checkout.wompi.co https://sandbox.wompi.co https://production.wompi.co';
const GA_DOMAINS         = 'https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com';
const CLOUDINARY_DOMAINS = 'https://api.cloudinary.com https://res.cloudinary.com';
const META_DOMAINS       = 'https://graph.facebook.com';

// CSP estricto (nonce) para la mayoría de páginas
function buildStrictCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://www.googletagmanager.com https://checkout.wompi.co`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://checkout.wompi.co",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com ${GA_DOMAINS} https://checkout.wompi.co`,
    `connect-src 'self' ${GA_DOMAINS} ${WOMPI_DOMAINS} ${CLOUDINARY_DOMAINS} ${META_DOMAINS}`,
    `media-src 'self' ${CLOUDINARY_DOMAINS}`,
    `frame-src https://checkout.wompi.co`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
}

// CSP permisivo para páginas de pago — Wompi inyecta scripts inline sin nonce.
function buildPaymentCsp(): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://checkout.wompi.co`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://checkout.wompi.co",
    "font-src 'self' https://fonts.gstatic.com https://checkout.wompi.co",
    `img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com ${GA_DOMAINS} https://checkout.wompi.co`,
    `connect-src 'self' ${GA_DOMAINS} ${WOMPI_DOMAINS} ${CLOUDINARY_DOMAINS} ${META_DOMAINS}`,
    `media-src 'self' ${CLOUDINARY_DOMAINS}`,
    `frame-src https://checkout.wompi.co`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
}

// v16: archivo renombrado de middleware.ts a proxy.ts.
// Runtime: nodejs. btoa y crypto.getRandomValues disponibles en Node 15+ vía Web Crypto.
//
// CSP solo en producción: Turbopack en dev inyecta scripts HMR sin nonce,
// y React dev mode necesita eval() para reconstruir call stacks — ambos se
// bloquean si aplicamos el CSP estricto en desarrollo.
export const proxy = auth((req) => {
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // /orders/[id] y /checkout/ cargan el widget de Wompi que inyecta scripts inline
  const isPaymentPage =
    (pathname.startsWith('/orders/') && pathname !== '/orders') ||
    pathname.startsWith('/checkout');

  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const csp   = isPaymentPage ? buildPaymentCsp() : buildStrictCsp(nonce);

  const reqHeaders = new Headers(req.headers);
  if (!isPaymentPage) reqHeaders.set('x-nonce', nonce);

  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
