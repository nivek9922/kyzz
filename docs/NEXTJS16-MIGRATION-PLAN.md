# KYZZ — Auditoría y Plan de Migración a Next.js 16

> Auditoría técnica basada en el código real del proyecto y en la guía oficial de Next.js 16 (v16.2.7).
> Autor: Auditoría técnica KYZZ · Fecha: 2026-06-01
> Estado: **Documento de decisión — sin implementación ejecutada.**

---

## Resumen ejecutivo

> **Veredicto: MIGRAR AHORA, en rama controlada.** KYZZ está en una posición inusualmente favorable: las dos partes más difíciles de una migración a v16 **ya están hechas**.

1. **React ya es 19.2.6** (`react`/`react-dom`) — Next 16 pide exactamente React 19.2. Cero trabajo aquí.
2. **Async Request APIs ya migradas** — 7 páginas usan `params: Promise<>`, 8 usan `searchParams: Promise<>`, **0** usan la forma síncrona `params: {`. El breaking change estrella de v16 ya está absorbido.
3. **Skew latente revelador:** `@next/third-parties@^16.2.6` ya está instalado mientras `next@^15.5.18`. El proyecto ya está medio pisando v16 (y es un bug latente que conviene resolver).
4. El trabajo real se reduce a: **~12 call sites de `revalidateTag` de un solo argumento** (error de TypeScript en v16) + **`middleware.ts → proxy.ts`** + **`next lint` → ESLint CLI** + validación de NextAuth v5 beta y Wompi.

**Estimación: 2–4 días enfocados.** Complejidad **media-baja**.

### Estado actual de dependencias (relevantes)

| Paquete | Versión actual | Nota para v16 |
|---|---|---|
| `next` | `^15.5.18` | → `16.x` |
| `react` / `react-dom` | `^19.2.6` | ✅ ya es la versión que pide v16 |
| `@types/react` / `@types/react-dom` | `^19.2.14` / `^19.2.3` | ✅ |
| `@next/third-parties` | `^16.2.6` | ⚠️ skew: ya en 16 con `next` en 15 |
| `next-auth` | `5.0.0-beta.31` | beta; split-config + JWT (favorable) |
| `@prisma/client` / `prisma` | `^5.22.0` | independiente del bump |
| `tailwindcss` | `^3.3.0` | independiente del bump |
| `eslint` / `eslint-config-next` | `^8.57.0` / `^15.5.18` | migrar a flat config |

---

## 1. ¿Vale la pena migrar actualmente?

**Sí, ahora, en rama aislada.** Razonamiento basado en el código:

- El costo histórico de migrar a v16 (async request APIs, React 19) **ya fue pagado** en este proyecto.
- El esfuerzo restante es mayormente mecánico y codemod-able.
- Migrar antes de que el catálogo de Server Actions crezca reduce el costo (hoy hay ~12 `revalidateTag`; cada feature nueva añade más).
- Hay un skew real (`@next/third-parties` 16 vs `next` 15) que ya puede causar comportamiento inconsistente y debe resolverse de todos modos.

**Condición de salida (gate):** la migración solo se da por buena cuando se valide en runtime: login/sesión (NextAuth v5 beta sobre runtime nodejs), CSP con nonce por request, y el flujo de pago Wompi.

## 2. Pros reales para KYZZ

- **Turbopack por defecto** en `dev` y `build`: arranques y HMR más rápidos (el proyecto no tiene config webpack custom → adopción limpia). Opción `turbopackFileSystemCacheForDev` para reinicios casi instantáneos.
- **React Compiler estable** (`reactCompiler: true`): auto-memoización. KYZZ tiene muchos client components (stores Zustand, formularios RHF, carruseles Swiper) → candidato real a menos re-renders sin tocar código.
- **Routing mejorado** (deduplicación de layouts + prefetch incremental): menos bytes por navegación, **sin cambios de código**. Beneficia la experiencia editorial premium de la marca.
- **`updateTag` (read-your-writes)**: el admin vería sus cambios al instante (hoy `revalidateTag` es stale-while-revalidate). Mejora UX del panel.
- **View Transitions (React 19.2)**: transiciones PDP ↔ grid suaves, alineadas con la identidad "editorial/aspiracional".
- **`next/image` con `minimumCacheTTL` 4h por defecto**: menos revalidaciones/costo de imágenes Cloudinary.

## 3. Contras reales

- NextAuth permanece en **beta** (`5.0.0-beta.31`); cualquier salto mayor de framework reintroduce riesgo de auth.
- Turbopack debe compilar **SCSS Modules + Tailwind 3 + Swiper + @react-email/render** sin sorpresas (alto valor, requiere validación).
- `revalidateTag` cambia de firma **y** semántica → no es solo "añadir un argumento": hay que decidir `revalidateTag` vs `updateTag` por call site (correctitud de stock/disponibilidad de producto).
- Migración de ESLint a flat config (no hay `eslint.config.*` ni `.eslintrc` en el repo; hoy se depende de `next lint`).

## 4. Riesgos (clasificados)

### 🔴 Riesgo Alto

- **`middleware.ts` → `proxy.ts`.** Hoy `src/middleware.ts` envuelve `auth()` de NextAuth v5 y genera **CSP nonce por request** (`btoa`, `crypto.getRandomValues`) con variante para páginas de pago. En v16 `proxy` corre en **runtime nodejs** (edge no soportado). KYZZ **ya tiene el patrón split-config** (`auth.config.ts` + `auth.ts`) y sesiones **JWT**, que es exactamente lo que Auth.js recomienda para v16 → camino conocido. Qué puede romperse: verificación de sesión, generación de nonce, o el CSP de Wompi bajo nodejs. **Mitigación:** v16 permite *mantener* `middleware.ts` (deprecado pero funcional) → migrar a `proxy.ts` como paso aislado y validado, no en el mismo PR que el bump.
- **Flujo de pago Wompi.** `buildPaymentCsp()` afloja el CSP para scripts inline de Wompi en `/orders/[id]` y `/checkout`. Validar end-to-end que el widget carga y el webhook/firma siguen OK tras el cambio de runtime.

### 🟡 Riesgo Medio

- **`revalidateTag` ×12** (`src/actions/**`): error de TS hasta migrar firma. Riesgo de *correctitud* si se elige mal `revalidateTag` vs `updateTag` (stock visible desactualizado).
- **Turbopack** compilando SCSS Modules + Tailwind + Swiper + react-email.
- **Skew `@next/third-parties@16`** con `next@15` → alinear a 16.
- **ESLint flat config** + quitar `next lint` del build.
- **Prisma generate** dentro de `build` script — validar que sigue corriendo con Turbopack build.

### 🟢 Riesgo Bajo

- Defaults de `next/image` (`qualities`→`[75]`, `imageSizes` sin 16). KYZZ ya fija `imageSizes`/`deviceSizes` explícitos; revisar props `quality` sueltas.
- Async Request APIs: **ya hecho**.
- Removals no usados: AMP, `next/legacy/image`, `images.domains`, `serverRuntimeConfig/publicRuntimeConfig`, `experimental_ppr`, parallel routes `@slots`. **Ninguno presente.**

## 5. Breaking changes encontrados (que aplican a KYZZ)

| # | Breaking change v16 | ¿Aplica? | Archivos / evidencia |
|---|---|---|---|
| 1 | `revalidateTag(tag)` → requiere 2º arg `cacheLife` | **Sí** | `actions/order/place-order.ts`, `actions/return/update-return-status.ts`, `actions/product/{manage-product-color,manage-product-variants,create-update-product,convert-product-type,toggle-product-featured,delete-product-image}.ts`, `actions/order/{create-manual-order,cancel-unpaid-orders}.ts` (~12 sitios) |
| 2 | `middleware` → `proxy` (nodejs, no edge) | **Sí** | `src/middleware.ts` (auth wrapper + CSP nonce) |
| 3 | `next lint` eliminado; `eslint` config de next eliminada | **Sí** | `package.json` script `"lint": "next lint"`; sin flat config |
| 4 | Turbopack por defecto en build | **Sí (favorable)** | `next.config.js` sin webpack; scripts `dev:turbo` obsoletos |
| 5 | Defaults `next/image` (`qualities`,`imageSizes`,`minimumCacheTTL`) | **Parcial** | `next.config.js` `images` |
| 6 | `@next/third-parties` debe ir a v16 | **Sí** | skew con `next@15` |
| — | Async Request APIs (cookies/headers/params/searchParams) | **No (ya migrado)** | `params: Promise<>` ×7, `searchParams: Promise<>` ×8, sync ×0 |
| — | AMP / legacy image / runtimeConfig / PPR / parallel routes | **No (no usados)** | grep sin resultados |

## 6. Beneficios concretos para KYZZ tras migrar

- Build/dev más rápidos (Turbopack) sin deuda de config.
- Panel admin con feedback inmediato (`updateTag`) — encaja con la regla de marca "siempre informar al usuario".
- Navegación más liviana (prefetch incremental) en grid de catálogo.
- Base lista para **Cache Components** (`'use cache'` + `cacheTag`) que reemplazaría el `unstable_cache` legado en `app/(shop)/product/[slug]/page.tsx`.
- React Compiler opcional para reducir re-renders en componentes cliente pesados.

## 7. Plan de migración por fases

### Fase 1 — Preparación (rama `feat/next16`)
- Crear rama; congelar features.
- Confirmar Node ≥ 20.9 y TS ≥ 5.1 en entorno/CI.
- Snapshot de baseline: `next build` actual + Lighthouse PDP/checkout para comparar después.
- Inventariar los 12 `revalidateTag` y clasificar cada uno: ¿read-your-writes (admin) → `updateTag` o stale-OK → `revalidateTag(tag,'max')`?

### Fase 2 — Actualización de dependencias
- `npx @next/codemod@canary upgrade latest` (o manual: `next@latest react@latest react-dom@latest` + `@types/*`).
- Alinear `@next/third-parties` a 16 (resolver skew).
- Limpiar `package.json`: quitar `--turbo`/`dev:turbo`; `dev`/`build`/`start` sin flags Turbopack.
- Migrar `next lint` → ESLint CLI (`next-lint-to-eslint-cli` codemod) + flat config `eslint.config.mjs`.
- (Independiente, no bloqueante) considerar Prisma 6 y Tailwind 4 en PRs separados — **fuera de alcance de este bump**.

### Fase 3 — Correcciones necesarias
- `revalidateTag` ×12 → firma v16 (`'max'`) o `updateTag` según clasificación de Fase 1.
- `src/middleware.ts` → `src/proxy.ts`: renombrar archivo + export `proxy`, importar `authConfig`, validar nonce/CSP bajo nodejs. **PR aislado.**
- `next.config.js`: revisar `images` (fijar `qualities` si hay props `quality` no-75; `imageSizes` ya explícito); `experimental.serverActions.bodySizeLimit` permanece válido.
- Resolver cualquier error de tipos de `next typegen`.

### Fase 4 — Optimización aprovechando v16 (opt-in, medible)
- `app/(shop)/product/[slug]/page.tsx`: migrar `unstable_cache` → `'use cache'` + `cacheTag` (flag `cacheComponents`).
- `updateTag` en mutaciones admin para read-your-writes.
- Evaluar `reactCompiler: true` (medir tiempo de build vs ganancia de runtime).
- View Transitions en navegación PDP ↔ grid.
- `turbopackFileSystemCacheForDev: true` en dev.

### Fase 5 — Testing y validación
- `npx tsc --noEmit` limpio.
- Build Turbopack OK (SCSS Modules, Tailwind, Swiper, react-email render).
- E2E manual del **gate**: registro/login (NextAuth nodejs), CSP nonce en páginas normales, CSP de pago + widget Wompi + webhook/firma, carrito→checkout→orden, panel admin (crear/editar producto → ver cambio), flujo de devoluciones.
- Comparar Lighthouse vs baseline de Fase 1.
- Verificar crons (`/api/cron/*`) y emails (Resend) intactos.

## 8. Nuevas funcionalidades que deberíamos implementar (post-migración)

- **Cache Components** para PDP y listados de catálogo (reemplaza `unstable_cache`).
- **`updateTag`** en panel admin (UX inmediata).
- **View Transitions** (marca editorial).
- **React Compiler** (si la medición lo justifica).

## 9. Estimación de complejidad

| Bloque | Complejidad | Esfuerzo |
|---|---|---|
| Bump deps + scripts + ESLint flat | Baja | 0.5 día |
| `revalidateTag` ×12 (clasificar + migrar) | Media | 0.5–1 día |
| `middleware → proxy` + validación auth/CSP | **Media-Alta** | 0.5–1 día |
| Validación Wompi + E2E gate | Media | 0.5–1 día |
| Optimización Fase 4 (opcional) | Media | 1–2 días (diferible) |
| **Total bump funcional (Fases 1–3,5)** | **Media-baja** | **2–4 días** |

## 10. Performance: quick wins / medias / avanzadas

- **Quick wins:** Turbopack default; prefetch incremental/dedup (gratis); `minimumCacheTTL` 4h en imágenes; `turbopackFileSystemCacheForDev`.
- **Medias:** `'use cache'` + `cacheTag` en PDP/listados; `updateTag` en admin; revisar `qualities` de imágenes.
- **Avanzadas:** React Compiler (auto-memoización de client components); View Transitions; segmentación fina de cache profiles (`cacheLife`).

---

## Recomendación final

**MIGRAR AHORA**, en rama `feat/next16`, secuenciando:

1. Bump + correcciones mecánicas (deps, scripts, ESLint, `revalidateTag`).
2. `middleware → proxy` como **PR aislado** con validación de auth.
3. Gate de pago Wompi.
4. Optimizaciones opt-in (Fase 4) después de estar verde.

La posición de partida (React 19.2 + async APIs ya hechas + sin webpack custom) hace que el riesgo/beneficio sea claramente favorable, y que postergar solo aumente el costo.

---

## Fuentes

- [Upgrading: Version 16 — Next.js (oficial, v16.2.7)](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 16 — blog de anuncio](https://nextjs.org/blog/next-16)
- [Auth.js — Migrating to v5](https://authjs.dev/getting-started/migrating-to-v5)
- [Auth.js — Edge Compatibility](https://authjs.dev/guides/edge-compatibility)
