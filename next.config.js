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
  // CSP se genera por petición en src/middleware.ts (nonce-based, no unsafe-inline para scripts)
];

const nextConfig = {
  outputFileTracingRoot: require('path').join(__dirname),
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
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
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
