# AGENTS.md — KYZZ

Guía operativa para agentes de IA que trabajen en este repositorio. Complementa `CLAUDE.md` (identidad de marca y reglas de UX). Aquí están la **arquitectura real**, las **convenciones del código** y los **gotchas** específicos del proyecto.

---

## Stack (verificado)

- **Next.js 16.2.7** (App Router, Turbopack por defecto) · **React 19.2** · TypeScript strict
- **Prisma 5 + PostgreSQL** · **NextAuth v5 beta** (JWT, roles admin/user)
- **Zustand** (carrito, dirección, wishlist, recently-viewed — persistidos en localStorage)
- **Wompi** (único gateway de pago, Colombia) · **Cloudinary** (imágenes) · **Resend** (emails)
- **Tailwind 3** + SCSS Modules · React Hook Form + Zod · Sonner (toasts)
- **NO se usa:** Framer Motion, Vitest (pese a menciones antiguas). Animaciones = CSS/Tailwind.

## Requisitos de entorno

- **Node ≥ 20.9** (obligatorio para Next 16). El shell por defecto puede tener Node 18 del sistema —
  usar `nvm use 24` antes de `build`/`tsc`/`lint`.
- `npm run build` ejecuta `prisma migrate deploy` primero — **no correr a ciegas** contra una DB real.
  Para validar build sin tocar la DB: `npx next build`.

## Arquitectura de carpetas

```
src/
  app/(shop)/          rutas públicas + admin (App Router, route groups)
  actions/             Server Actions por dominio (order, product, return, review, ...)
  components/          UI reutilizable (index.ts barrel)
  lib/                 prisma, resend, stock-ops, whatsapp-api, phone, ...
  store/               Zustand stores (cart, wishlist, address, recently-viewed)
  config/              fonts, constants
  emails/              plantillas React Email
  auth.ts / auth.config.ts   NextAuth (split config)
  proxy.ts             middleware v16 (CSP + auth)
```

Capas: **ui → actions → lib (repos/ops) → prisma**. No meter lógica de negocio en componentes.

## Convenciones críticas del código

### Caché e invalidación (Next 16)
- **`updateTag(tag)`** en Server Actions que mutan y donde el actor debe ver el cambio al instante
  (stock, edición de producto, etc.). Es la opción por defecto. Ver `actions/product/*`, `actions/order/place-order.ts`.
- **`revalidateTag(tag, 'max')`** SOLO donde `updateTag` no está disponible (route handlers / crons):
  único caso hoy = `actions/order/cancel-unpaid-orders.ts` (compartido con `/api/cron/cancel-orders`).
- Tag canónico de producto: **`product:{slug}`** — consumido por la PDP (`unstable_cache` en `product/[slug]/page.tsx`).
- `revalidatePath` sigue válido (1 argumento) y se usa para rutas admin.
- Detalle completo de la clasificación: `docs/NEXTJS16-PHASE1-PREP.md`.

### Imágenes
- Cadena de fallback estándar: `variant.color.images[0] → product.ProductImage[0] → product.ProductColors[0].images[0]`.
- Usar el componente `ProductImage` (`components/product/product-image/ProductImage.tsx`) que resuelve
  URLs locales vs Cloudinary y tiene fallback a placeholder. No usar `next/image` crudo para productos.

### Auth y seguridad
- `auth.config.ts` = config liviana (sin Prisma/bcrypt), usada por `proxy.ts`. `auth.ts` = config completa.
- **CSP con nonce** se genera por request en `proxy.ts`, **solo en producción** (en dev se omite: Turbopack
  inyecta scripts HMR sin nonce y React dev necesita `eval()`).
- Stock es la fuente de verdad vía `ProductVariant` (talla × color). Toda mutación de stock pasa por `lib/stock-ops.ts`.

### Feedback UX (regla de marca)
- Todo flujo async: loading + success + error con **toasts Sonner**. PROHIBIDO `alert()` o silencios.

## Gotchas conocidos (Next 16 / React Compiler)

1. **`className` en una sola línea.** El React Compiler (activo, `reactCompiler: true`) transforma
   `className` multilínea estático en expresión → **hydration mismatch**. Mantener classNames en una línea.
2. **`cacheComponents` está desactivado** a propósito. Activarlo requiere resolver: `Footer` usa `new Date()`,
   `RootLayout` lee `headers()` (nonce), y `/_not-found`. Es un proyecto aparte, no un flag.
3. **`ViewTransition` de React** no está exportada aún en 19.2.6 — no intentar importarla.
4. Categorías oficiales: **jeans, blusas, enterizos, chaquetas**. Tienda 100% femenina. NO usar men/unisex/women.
   (Existe ruta legacy `/categoria/[slug]` que solo redirige a `/products?category=`.)

## Reglas de negocio (postventa)

- Devoluciones: máquina de estados completa (ver `docs/POST-SALES-ARCHITECTURE.md`). Stock devuelto pasa por
  **cuarentena** antes de volver a vendible. Ventanas legales: Ley 1480 (retracto 5 días hábiles).
- Wompi es el único gateway (PayPal fue eliminado).

## Flujo de trabajo con Git

- **NO hacer commit ni push salvo petición explícita del usuario.**
- Rama de migración v16 en curso: `feat/next16`.

## Verificación antes de entregar

```bash
nvm use 24
npx tsc --noEmit      # 0 errores
npm run lint          # 0 errores (warnings del React Compiler OK)
npx next build        # verde (sin tocar la DB)
```
