# KYZZ → plantilla white-label → DEMACHOS · 01 · Diagnóstico

Diagnóstico verificado de KYZZ, del diseño de DEMACHOS y de la información disponible sobre EFFI ERP, como base de la hoja de ruta.

> Documentos: [01 · Diagnóstico](01-diagnostico.md) · [02 · Hoja de ruta](02-hoja-de-ruta.md) · [03 · EFFI: viabilidad](03-effi-viabilidad.md)

**Fecha:** 27-10-2026 · **Estado:** propuesta para revisión · **Alcance:** solo planificación, sin cambios de código.

## Contexto y alcance de esta entrega

Kevin quiere convertir KYZZ (ecommerce de moda en producción, Next.js 16.2.7, Prisma 5 y next-auth v5 beta) en una **base privada y reutilizable de marca blanca** para su negocio de tiendas online, sin comprometer KYZZ. El primer cliente es **DEMACHOS** (Distribuidora DEMACHOS Barber, Popayán), con un diseño ya hecho en Claude Design e integración con **EFFI ERP**.

Esta v2 incorpora la revisión de Kevin: el estudio de viabilidad de EFFI adelantado, las APIs de Next verificadas en la documentación oficial, el diseño de reservas frente al inventario de EFFI, la minimización de datos personales, un núcleo mínimo separado de los módulos, la primera entrega vendible y los aspectos operativos y comerciales.

**Niveles de evidencia usados en este documento:**
- **[C-código]**: confirmado leyendo el código, con archivo y línea.
- **[C-doc]**: confirmado en la documentación oficial.
- **[C-runtime]**: reproducido en ejecución. Todavía no hay ningún hallazgo con este nivel.
- **[Indicio]**: fuente secundaria.
- **[H]**: hipótesis que requiere prueba.

---

## 1. Diagnóstico verificado

### 1.1 Stack actual frente a stack objetivo

| Pieza | KYZZ | Objetivo de la plantilla | Evidencia |
|---|---|---|---|
| Next.js | 16.2.7 | 16.4.x (16.4.3 es `latest` en npm) | [C-doc] npm registry y releases de GitHub |
| React | 19.2.6 | 19.3.x (viene con Next 16.4) | [C-doc] npm |
| Prisma | 5.22 | **7.x fijado en `^7`**, con `@prisma/adapter-pg` y `prisma.config.ts`. **No** Prisma 8 (RC; `npm i prisma` ya instala la 8) | [C-doc] estado de releases de Prisma. stockvek y citavek ya usan 7.10 |
| Auth | next-auth 5.0.0-beta.31 | **Better Auth** (decisión de Kevin) | [C-doc] v5 nunca fue estable y authjs.dev anuncia su integración en Better Auth. stockvek y citavek usan 1.7.12 |
| Tailwind / Zod | 3.3 / 3.22 | 4.x / 4.x | stockvek y citavek ya los usan |
| Tests / CI | **No hay** | Vitest 4 + Playwright + GitHub Actions | [C-código] no hay config ni archivos de test ni `.github/` |

### 1.2 APIs de Next.js verificadas en la documentación oficial

La verificación se hizo con la documentación incluida en `node_modules/next/dist/docs` de **Next 16.4.2** (instalada en stockvek-app). **Al fijar la versión exacta en F3 se repite la comprobación con la documentación de esa versión.**

| API | Estado | Ruta en la documentación | Uso en el plan |
|---|---|---|---|
| `cacheComponents` (top-level) | Estable desde v16 | `05-config/01-next-config-js/cacheComponents.md` | Activar en la plantilla (F3g) |
| `"use cache"`, `cacheLife`, `cacheTag` | Estables desde v16.0.0 | `01-directives/use-cache.md`, `04-functions/cacheLife.md`, `04-functions/cacheTag.md` | Catálogo, PDP y home |
| `updateTag` | Estable. **Solo funciona dentro de Server Actions** (no en Route Handlers) | `04-functions/updateTag.md` | Mutaciones del admin |
| `revalidateTag(tag, profile)` | Estable. Sin segundo argumento está **deprecado**; se recomienda `'max'` | `04-functions/revalidateTag.md` | **Sincronización de EFFI desde cron o webhook (Route Handler)** |
| `ensureStatic` | **Existe, introducido en v16.4.0.** Valores `'auto' \| 'shell' \| 'prefetch' \| 'navigation' \| false`. **Solo funciona con `cacheComponents`** (si no, el build falla). `'navigation'` no requiere Partial Prefetching | `03-file-conventions/02-route-segment-config/ensureStatic.md` | Solo en rutas sin datos por petición (páginas legales y FAQ). **No en la PDP**, que muestra stock en vivo |
| `navigation()` / `prefetch()` (`next/cache`) | Introducidos en v16.4.0 | `04-functions/navigation.md`, `04-functions/prefetch.md` | No se usan en v1 |
| `partialPrefetching` | Opción de configuración documentada (requiere Cache Components) | `05-config/01-next-config-js/partialPrefetching.md` | **No en v1**. Se evaluará después |
| `typedRoutes` (top-level) | Estable | `typedRoutes.md` | Sí |
| `reactCompiler` (top-level) | Estable desde v16.0.0 | `reactCompiler.md` | Ya en uso |
| `catchError` | Estable desde v16.3.0 | `04-functions/catchError.md` | Límites de error del checkout |
| `proxy.ts` | `middleware` está deprecado y renombrado a Proxy en v16.0.0, con runtime Node por defecto | `03-file-conventions/proxy.md` | Ya en uso |

**Correcciones respecto a v1:**
- La frase «Cache Components será el comportamiento por defecto en Next 17» **solo aparece en el blog** de Next 16.4. No consta en la documentación de referencia, así que se trata como [Indicio].
- La caché de `"use cache"` vive **en memoria por defecto** y en serverless no persiste entre instancias [C-doc]. Por eso **el stock y el precio de checkout nunca se sirven desde `"use cache"`**: se leen en el servidor en cada petición o dentro de un `<Suspense>` dinámico.

### 1.3 Seguridad: hallazgos confirmados frente a hipótesis

**Confirmados por código** (falta reproducirlos en ejecución):

| # | Hallazgo | Evidencia | Severidad | ¿Hotfix en KYZZ? |
|---|---|---|---|---|
| S1 | **[Hotfix aplicado en la rama local `fix/auth-session-password-leak`, sin commit]** El hash bcrypt llega a la sesión del cliente. En el login con Google, `token.data = dbUser` (fila completa con `password`) y luego `session.user = token.data` | [src/auth.ts:63-64](../../src/auth.ts#L63-L64) y [src/auth.ts:83](../../src/auth.ts#L83) | Alta. Solo afecta a cuentas que **tienen contraseña** y además inician sesión con Google, y expone el hash al navegador de su propio dueño (y por tanto a XSS o extensiones) | **Sí, es el único hotfix estrictamente necesario** |
| S2 | El rol queda congelado en el JWT: hay 60 comprobaciones de `session.user.role` sin volver a consultar la BD | grep en `src/`, estrategia JWT en `auth.config.ts` | Media-baja (un admin degradado conserva el acceso hasta que expira el token) | No. Se resuelve en la plantilla con Better Auth |
| S3 | La CSP estricta incluye `'unsafe-eval'` | [src/proxy.ts:16](../../src/proxy.ts#L16) | Media-baja | No |
| S4 | `captureAbandonedCart(email, items)` no tiene Zod ni rate limit y usa `as any` | `src/actions/order/capture-abandoned-cart.ts:17,30,34` | Media (basura o abuso en la BD) | No |
| S5 | Las subidas de `manage-product-color` no validan MIME ni tamaño. Solo puede hacerlas un admin | `manage-product-color.ts:12-36` | Baja | No |
| S6 | Si falta `CRON_SECRET`, los crons quedan abiertos. Si falta `WHATSAPP_APP_SECRET`, se omite la verificación HMAC, y las firmas se comparan con `!==` en lugar de una comparación de tiempo constante | `api/cron/*/route.ts`, `api/whatsapp/webhook/route.ts:31-35` | Depende de la configuración de producción → **[H]** hay que comprobar las variables en Vercel | No (solo verificar la configuración) |
| S7 | `placeOrder` no tiene esquema Zod. El precio sí se lee de la BD (correcto) | `place-order.ts:23,55` | Ver H2 | No |
| S8 | El unsubscribe es un GET con efecto secundario e interpola el email en HTML sin escapar | `api/newsletter/unsubscribe/route.ts:4,18,44` | Ver H3 | No |
| S9 | **Next 16.2.7 tiene advisories publicados** (antes H5). Para cerrarlos todos hace falta **> 16.4.0** (16.4.3 es `latest`). Algunos dependen de condiciones que KYZZ quizá no cumpla (Windows, AVIF/SVG en Image Optimization, `use cache`). Otros aplican directamente: el bypass de Proxy con Turbopack (< 16.2.11), el RCE en `next/og` `ImageResponse` (16.2.x < 16.3.6, y KYZZ genera su favicon con `app/icon.tsx`) y la exposición de endpoints de Server Functions (< 16.2.11) | `npm audit --omit=dev` (27-10-2026) | **Crítica** | **Recomendado, pendiente de decisión D11** |
| S10 | **next-auth 5.0.0-beta.31 / @auth/core** tienen 4 advisories, corregidos en **beta.32**: comprobaciones de auth que fallan en abierto ante errores de configuración, bypass del normalizador de email por homoglifos, cookies OAuth no ligadas al proveedor y una excepción con Bearer malformado | `npm audit --omit=dev` | Crítica | **Recomendado, pendiente de decisión D11** |

**Hipótesis que requieren prueba:**
- **H1.** `cron-return-cleanup.ts` (`'use server'`, sin auth) podría ser invocable como server action. Solo lo importa un Route Handler, y en Next 16 las acciones que no se referencian desde el cliente no se exponen. Se verificará en el manifiesto del build.
- **H2.** Cantidades negativas, cero o no enteras en `placeOrder` podrían alterar el stock reservado o los totales. Se verificará con un test de integración.
- **H3.** XSS reflejado o almacenado en el unsubscribe, si la validación del email permite `<` y `>`. Se verificará con un test.
- **H4.** La vinculación automática de Google por email (`upsert` en `signIn`) podría permitir tomar una cuenta si un atacante controla una cuenta de Google con ese email. Es poco probable, porque Google verifica los emails. Hay que analizarlo.
- ~~**H5.**~~ Confirmada como S9 y S10 con `npm audit` (27-10-2026). npm audit reporta además dependencias transitivas de producción vulnerables (postcss, sharp, nanoid, source-map-js y zod < 4.6.6), que se corrigen con la subida de versiones de F3.

### 1.4 Licencias de terceros

- **Código base (teslo-shop): resuelto, no bloquea ninguna fase.** KYZZ procede del curso de Fernando Herrera (commit inicial `9ad7b1d`, «rebrand from teslo-shop»). Kevin compró el curso y sus términos permiten usar, modificar y comercializar el código, también para tiendas de clientes (confirmado por Kevin el 27-10-2026). Que los repos públicos del curso no tengan archivo LICENSE no cambia esto. Como buena práctica, conviene guardar el comprobante de compra y la referencia a los términos del curso entre los archivos internos del negocio.
- **Dependencias npm (higiene, se hace en F1):** `package-lock.json` no trae la licencia de 117 paquetes, así que hay que escanearlas con una herramienta y generar `THIRD_PARTY_NOTICES.md`. Ya se ha detectado LGPL-3.0 en `@img/sharp-libvips-*` (binario enlazado dinámicamente por Next Image; es un uso habitual, solo hay que documentarlo) y MPL-2.0 en `axe-core` (solo desarrollo).
- **Fuentes e iconos de DEMACHOS:** Big Shoulders Display, Archivo e IBM Plex Mono son de Google Fonts (normalmente con licencia OFL) y Material Symbols suele tener licencia Apache-2.0. Se confirma en el mismo escaneo.

### 1.5 Arquitectura real y bloqueos para la marca blanca (resumen)

- **Capas reales**: UI → server actions (unos 85 archivos) → `lib/` → Prisma. No existen `services/` ni `repositories/`.
- **Piezas reutilizables**: `lib/stock-ops.ts` (reservas), `placeOrder` (compra como invitado, contraentrega), Wompi (firma y webhook), emails con React Email y Resend, Cloudinary, CSP con nonce y headers.
- **Bloqueos para la marca blanca**:
  - Unos 2.300 tokens `kyzz-*`, colores hex fijos en 26 archivos y unas 166 cadenas de marca.
  - Enums de Prisma con la marca (`KYZZ_ERROR`, `ShippingResponsibility.KYZZ`).
  - Categorías fijas en el código.
  - Prefijos de Cloudinary y de localStorage con la marca.
  - Imágenes de Tesla en `public/`.
- **Documentación de Claude desactualizada**: CLAUDE.md está desfasado (SCSS, Vitest, `/colecciones`). Los 3 agentes tienen el frontmatter mal formado. No hay `settings.json` ni skills.

### 1.6 Diseño de DEMACHOS (artefactos de Claude Design «Ecommerce DEMACHOS»)

- **Pantallas**: inicio, catálogo con filtros y orden, PDP con variante única, combos, carrito en panel lateral, checkout como invitado en 3 pasos, confirmación, ayuda y FAQ, footer legal. Vista de escritorio y móvil.
- **Catálogo**: 10 categorías.
- **Identidad**: `#141414`, `#D1AE6C`, `#F3F0EA` y `#DCD6CA`; tipografías Big Shoulders Display, Archivo e IBM Plex Mono; iconos Material Symbols (unos 2 MB, que se sustituirán por SVG).
- **El propio diseño marca como «por confirmar»**: precios, envíos, garantías, cambios, pagos, contacto, condiciones mayoristas, facturación e IVA.

### 1.7 EFFI ERP: lo que se sabe

| Nivel | Contenido | Fuente |
|---|---|---|
| [C-doc] | «Interfaz para desarrolladores» para *consultar y registrar clientes, artículos, ventas, compras, guías y más*, con «documentación completa» y «avisos automáticos de cada cambio» | effi.com.co (27-10-2026) |
| [C-doc] | Integración nativa con Shopify, WooCommerce y PrestaShop: los pedidos entran automáticamente y el inventario se actualiza | effi.com.co |
| [Indicio] | En la integración con Shopify se crea el cliente, se crea la orden de venta y se descuentan las unidades del inventario | Fragmento de búsqueda de ayuda.effi.com.co. La página no fue accesible (DNS) |
| Desconocido | URL base, autenticación, endpoints, límites, webhooks, sandbox, costo y plan requerido, variantes, combos, bodegas y factura DIAN | No hay documentación pública ni local |
| Descartado | efipay.co (otra empresa, pasarela de pagos) y la app «Effi» de Shopify (otro producto, de Quebec) | — |
