import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // unsafe-eval required by PayPal SDK (uses eval() internally — cannot be removed without replacing PayPal)
    // nonce replaces unsafe-inline: inline scripts must carry the per-request nonce to execute
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://www.paypal.com https://www.sandbox.paypal.com https://www.googletagmanager.com`,
    // unsafe-inline required by Framer Motion (sets style="" attributes at runtime for animations)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://www.paypalobjects.com https://www.google-analytics.com https://www.googletagmanager.com",
    "connect-src 'self' https://api-m.sandbox.paypal.com https://api-m.paypal.com https://www.sandbox.paypal.com https://www.paypal.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com",
    "frame-src https://www.paypal.com https://www.sandbox.paypal.com https://*.paypal.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export default auth((req) => {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const csp = buildCsp(nonce);

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-nonce', nonce);

  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
