/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Prevenir clickjacking
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Prevenir MIME sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Forzar HTTPS en producción
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Controlar referrer
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Permisos de APIs del navegador (cámara, micrófono, etc.)
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Content Security Policy básica (ajustar según servicios usados)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com https://www.sandbox.paypal.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://res.cloudinary.com https://www.paypalobjects.com https://www.google-analytics.com https://www.googletagmanager.com",
      "connect-src 'self' https://api-m.sandbox.paypal.com https://api-m.paypal.com https://www.sandbox.paypal.com https://www.paypal.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com",
      "frame-src https://www.paypal.com https://www.sandbox.paypal.com https://*.paypal.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
    // Tamaños optimizados para grid de productos y PDP
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 500],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // Reducir información expuesta en headers
  poweredByHeader: false,
};

module.exports = nextConfig;
