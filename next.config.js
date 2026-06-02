// @ts-check
/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // CSP se genera por petición en src/proxy.ts (nonce-based, no unsafe-inline para scripts)
];

const nextConfig = {
  outputFileTracingRoot: require('path').join(__dirname),

  // v16: React Compiler estable — auto-memoización de componentes sin useMemo/useCallback manual.
  // Aumenta el tiempo de build (usa Babel internamente).
  reactCompiler: true,

  experimental: {
    // bodySizeLimit necesario para uploads de imágenes a Cloudinary (hasta 4mb)
    serverActions: {
      bodySizeLimit: '4mb',
    },
    // Cache de disco para Turbopack en dev — reinicios casi instantáneos tras el primer arranque
    turbopackFileSystemCacheForDev: true,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Incluir 16px explícitamente (v16 lo quitó del default, pero KYZZ lo usa en iconos admin)
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 500],
    // v16 sube el default a 14400 (4h); mantener explícito para no depender del default
    minimumCacheTTL: 14400,
    // v16 restringe qualities a [75] por default; fijar explícitamente para futuro
    qualities: [75],
  },

  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },

  poweredByHeader: false,
};

module.exports = nextConfig;
