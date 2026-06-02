# KYZZ — Auditoría de Aprovechamiento de Next.js 16

> Auditoría de **aprovechamiento** (no de migración). KYZZ ya corre en Next.js 16.2.7.
> Basada en el código real del proyecto. Fecha: 2026-06-02.
> Estado: **documento de análisis — sin implementación.**

---

## 0. Estado actual (línea base verificada)

Lo que **ya está aprovechado** tras la migración:

| Capacidad v16 | Estado | Evidencia |
|---|---|---|
| Turbopack (dev + build) | ✅ por defecto | `package.json` sin flags |
| React Compiler | ✅ activo | `reactCompiler: true` |
| Turbopack FS cache (dev) | ✅ activo | `experimental.turbopackFileSystemCacheForDev` |
| `updateTag` (read-your-writes) | ✅ 11 Server Actions | `src/actions/**` |
| `revalidateTag(tag,'max')` | ✅ 1 sitio (cron) | `cancel-unpaid-orders.ts` |
| proxy.ts (nodejs) | ✅ migrado | `src/proxy.ts` |

Lo que **NO está aprovechado** (oportunidades):

| Capacidad v16 | Estado | Impacto potencial |
|---|---|---|
| `cacheComponents` + `'use cache'` | ❌ intentado y revertido | Alto |
| PPR (Partial Prerendering) | ❌ (depende de cacheComponents) | Alto |
| Suspense / Streaming | ❌ **0 usos en todo el proyecto** | Alto |
| `generateStaticParams` (SSG catálogo) | ❌ ninguno | Alto (SEO + TTFB) |
| `sitemap.ts` / `robots.ts` | ❌ no existen | Alto (SEO) |
| `generateMetadata` | ⚠️ solo en PDP (1 de ~10 rutas públicas) | Medio (SEO) |
| `Link` `transitionType` / `onNavigate` | ❌ sin uso | Medio (UX) |
| `taint` (anti-fuga de datos) | ❌ sin uso | Medio (seguridad) |
| SRI (Subresource Integrity) | ❌ sin uso | Bajo-Medio (seguridad) |
| `@next/bundle-analyzer` | ❌ no instalado | Medio (DX) |
| `AGENTS.md` | ❌ no existe | Medio (DX) |
| Next.js DevTools MCP | ❌ sin configurar | Bajo (DX) |

---

## 1. Cache Components (`'use cache'`, `cacheLife`, `cacheTag`)

### Contexto crítico — por qué hoy NO está activo

En la migración se intentó `cacheComponents: true` y **se revirtió** por bloqueos arquitecturales reales (no por capricho):

1. **`Footer.tsx` usa `new Date().getFullYear()`** sin acceso previo a request data → error de prerender en v16.
2. **`RootLayout` lee `headers()`** para el nonce CSP → obliga a `connection()` y rompe el prerender de `/_not-found`.
3. **Todas las páginas admin/usuario** necesitarían `connection()` explícito o `'use cache'` por componente.

`cacheComponents` es **todo-o-nada a nivel de app**: al activarlo, *nada* se cachea implícitamente y *toda* página dinámica debe declararse. Es una migración arquitectural, no un flag.

### Estrategia recomendada (si se decide adoptar Cache Components)

| Superficie | Directiva | `cacheLife` | `cacheTag` | Justificación |
|---|---|---|---|---|
| Home (`/`) | `'use cache'` | `hours` | `nav`, `featured` | Catálogo curado, cambia poco |
| PLP `/products` | dinámico (searchParams) | — | — | Filtros/orden en tiempo real |
| PDP `/product/[slug]` | `'use cache'` | `hours` | `product:{slug}` | Ya tiene el patrón con `unstable_cache` |
| `/coleccion-especial` | `'use cache'` | `hours` | `featured` | Lista curada |
| `/categoria/[slug]` | `'use cache'` | `hours` | `category:{slug}` | Cambia poco |
| Carrito / Checkout | dinámico (`connection()`) | — | — | 100% personal/efímero |
| Admin (todo) | dinámico (`connection()` en layout) | — | — | Siempre fresco, requiere auth |
| Analytics admin | dinámico | — | — | Agregaciones en vivo |

### Prerequisito antes de activar `cacheComponents`

1. `Footer.tsx`: mover `new Date().getFullYear()` a una constante de build o a un Client Component.
2. `RootLayout`: aislar la lectura de `headers()` (nonce) o asumir el árbol como dinámico vía `connection()`.
3. Añadir `connection()` a layouts de `admin/`, `orders/`, `devoluciones/`, y `not-found` global.

> **Recomendación:** NO es quick win. Es un proyecto medio (2-3 días) con riesgo medio. Hacerlo como PR aislado con su propio gate de validación. El beneficio real es PPR (shell estático + islas dinámicas en streaming).

---

## 2. `updateTag` — estado y oportunidades nuevas

**Ya implementado** en 11 Server Actions de producto/pedido (correcto: read-your-writes para que el admin/cliente vea el cambio al instante). Oportunidades **adicionales** detectadas:

| Acción | Archivo | ¿Tiene updateTag? | Recomendación |
|---|---|---|---|
| Crear/editar cupón | `actions/coupon/*` | ❌ revisar | Añadir `updateTag('coupons')` si hay listado cacheado |
| Newsletter (suscribir) | `actions/newsletter/*` | ❌ | No aplica (no hay lista pública cacheada) |
| Cambiar config sitio | `actions/*siteConfig*` | ❌ revisar | `updateTag('nav')` / `updateTag('hero')` si home se cachea |
| Reviews de producto | `actions/review/*` | ❌ | `updateTag('product:{slug}')` al aprobar review |

> El tag `product:{slug}` ya cubre stock/precio/imágenes. Falta cubrir **reviews** (hoy la PDP cachea `getProductReviews` dentro del mismo bloque pero no se invalida al crear review).

---

## 3. `refresh()` — análisis

`refresh()` refresca el **router del cliente** desde un Server Action (no invalida cache de datos). Útil cuando el admin actúa y debe ver la UI actualizada **sin** `revalidatePath` completo.

| Caso | ¿Usar `refresh()`? | Por qué |
|---|---|---|
| Crear/editar producto | Opcional | Ya se usa `revalidatePath('/admin/products')` que es suficiente |
| Marcar destacado | ✅ candidato | `refresh()` es más liviano que `revalidatePath` para reflejar el toggle |
| Inventario (ajuste stock) | ✅ candidato | El admin ve el nuevo stock sin recargar |
| Cambiar estado de pedido/devolución | ✅ candidato | UX inmediata en el panel |

> **Recomendación:** `refresh()` es complementario, no reemplaza `updateTag`. `updateTag` invalida el dato cacheado (público); `refresh()` repinta la vista del actor. En flujos admin donde ya hay `router.refresh()` del lado cliente (ej. `ReturnFlowManager`), evaluar mover a `refresh()` server-side para consistencia.

---

## 4. `revalidateTag` — auditoría de corrección

Estado tras migración: **1 solo uso** (`cancel-unpaid-orders.ts`, con `'max'`, correcto porque corre en cron route donde `updateTag` no existe).

**Diagnóstico:**
- ✅ Sin invalidaciones excesivas (no hay `revalidateTag` "barriendo" tags amplios).
- ⚠️ **Invalidación faltante: reviews.** Crear una review no invalida `product:{slug}`, así que la PDP cacheada no muestra la review nueva hasta que expire (1h). Añadir `updateTag('product:{slug}')` en `create-review`.
- ⚠️ **`revalidatePath` redundante.** Varias acciones llaman 3-4 `revalidatePath` + `updateTag` del mismo producto. Tras adoptar tags, varios `revalidatePath` de rutas públicas (`/product/{slug}`, `/`) son redundantes con el tag. Limpieza de bajo riesgo.

---

## 5. Performance

| Área | Estado actual | Oportunidad v16 |
|---|---|---|
| Navegación | Prefetch default de Link | `cachedNavigations` (experimental) para cachear vistas visitadas |
| Imágenes | Cloudinary + `next/image` ✅ bien configurado | Ya óptimo (qualities/sizes/TTL fijados) |
| Vídeo hero | `HeroVideo` client component | Verificar `preload="none"` + poster (LCP) |
| Catálogo (PLP) | `InfiniteProductGrid` client | OK; evaluar streaming del primer batch con Suspense |
| Filtros/búsqueda | searchParams → server | OK (dinámico correcto) |
| **Streaming** | ❌ **0 Suspense** | **Mayor oportunidad**: envolver secciones lentas |
| CSS | global | `experimental.inlineCss` (inline critical CSS) |

### Suspense / Streaming — la oportunidad #1 de performance

Hoy **ninguna** página usa `<Suspense>`. La PDP (`product/[slug]/page.tsx`) hace `await` de producto + colores + variantes + reviews + auth en serie/paralelo y **bloquea todo el render** hasta tener todo. Patrón ideal v16:

```
PDP shell (producto + precio + add-to-cart)  →  render inmediato
  <Suspense> Reviews </Suspense>              →  stream cuando lleguen
  <Suspense> Recomendados </Suspense>         →  stream cuando lleguen
```

Beneficio: LCP/TTFB más bajos en PDP (la parte vendedora aparece sin esperar reviews). **Quick win de impacto alto.**

---

## 6. Flags experimentales mencionados — veredicto honesto

Los tres flags que mencionaste **existen** en el schema de v16 (verificado en `node_modules/next/dist/server/config-schema.js`):

| Flag | ¿Existe? | ¿Tiene sentido para KYZZ? | Riesgo |
|---|---|---|---|
| `experimental.prefetchInlining` | ✅ Sí | Marginal — inlinea datos de prefetch en el HTML. Útil si hay muchos Links above-the-fold (grid). Medir | Medio (experimental) |
| `experimental.cachedNavigations` | ✅ Sí | Sí — cachea vistas ya visitadas (back/forward instantáneo). Bueno para catálogo ↔ PDP | Medio |
| `experimental.appNewScrollHandler` | ✅ Sí | Sí — mejor manejo de scroll en navegación. Bajo riesgo | Bajo |
| `experimental.inlineCss` | ✅ Sí | Sí — inline critical CSS, mejora FCP | Bajo-Medio |

> **Recomendación:** son experimentales. Activar **uno a la vez** en `feat/next16-perf`, medir con Lighthouse, no en bloque. Ninguno es bloqueante; todos son "nice to have" medibles.

---

## 7. Link Transitions (`transitionType` / `onNavigate`)

`Link` en v16 soporta `onNavigate` y `transitionType` (verificado en `link.js`). KYZZ no usa ninguno.

| Dónde | Recomendación |
|---|---|
| Grid PLP → PDP | `transitionType` para transición editorial (alinea con marca premium) |
| Navbar dropdown categorías | No necesario |
| Admin | No (prioriza velocidad sobre animación) |

> **Nota:** la API `ViewTransition` de React (transiciones declarativas) **aún no está exportada** en React 19.2.6 instalado (verificado). `Link transitionType` es la vía disponible hoy. Cuando React libere `ViewTransition`, reevaluar.

---

## 8. Error Handling

Estado actual:
- ✅ `error.tsx` en root, `admin/`, `gender/`
- ✅ `loading.tsx` en 6 rutas (cart, checkout, coleccion-especial, orders, products, product/[slug])
- ✅ `not-found.tsx` en `product/`, `gender/`
- ❌ **NO hay `global-error.tsx`** (captura errores del root layout)
- ⚠️ La API que mencionaste, `unstable_catchError()`, **no existe**. La real es **`unstable_rethrow`** (para re-lanzar errores de control de flujo dentro de try/catch en Server Components).

| Gap | Recomendación | Impacto |
|---|---|---|
| `global-error.tsx` ausente | Crear con branding KYZZ (hoy un error en root layout muestra pantalla blanca de Next) | Medio |
| `unstable_rethrow` | Usar en `try/catch` de Server Components que llaman `notFound()`/`redirect()` para no tragarse esos throws | Bajo |
| `not-found` global | Crear `src/app/not-found.tsx` con branding (hoy usa el default) | Bajo |

---

## 9. Seguridad

### Taint API (`experimental.taint`) — recomendado

`cacheComponents` aparte, **`taint` es activable hoy independientemente**. KYZZ pasa objetos de Prisma a Client Components en varios lugares (productos con campos internos, usuarios). `taint` previene fugas accidentales de campos sensibles (ej. `User.password`, `refundTransactionId`, notas internas de devolución).

```ts
// next.config.js
experimental: { taint: true }
// luego en queries sensibles: experimental_taintObjectReference(...)
```

> **Impacto:** Medio. **Riesgo:** Bajo. Defensa en profundidad para un ecommerce con datos de pago/PII.

### SRI (Subresource Integrity)

El schema de v16 soporta `sri` (verificado). Genera hashes de integridad para los scripts de Next.

| Pro | Contra |
|---|---|
| Protege contra scripts manipulados (CDN comprometido) | Puede chocar con el CSP nonce-based actual de `proxy.ts` |

> **Recomendación:** Bajo prioridad. KYZZ ya tiene CSP estricto con nonce. SRI añade poco margen y debe validarse que no rompa Wompi/GA. Evaluar solo si hay requisito de cumplimiento.

---

## 10. Bundle / dependencias

No hay `@next/bundle-analyzer` instalado → no hay visibilidad. Hallazgos por inspección:

| Hallazgo | Detalle | Acción |
|---|---|---|
| `react-icons/io5` × 41 imports | Named imports — tree-shake OK en Turbopack, pero 41 superficies | Verificar con analyzer; considerar sprite propio si pesa |
| 79 componentes `'use client'` | Alto para un catálogo SSR-first | Auditar cuáles pueden ser Server Components (ej. los que solo formatean) |
| Solo 2 `next/dynamic` | Poco code-splitting manual | Lazy-load Swiper, NewsletterPopup, widgets de pago |
| `swiper@12` | Carrusel — pesado | `next/dynamic` con `ssr:false` donde aplique |
| `CLAUDE.md` menciona Framer Motion | **No está en `package.json`** | Doc desactualizada; corregir |

> **Quick win:** instalar `@next/bundle-analyzer`, correr `ANALYZE=true npm run build`, y atacar el ranking real. Sin datos, lo anterior es hipótesis.

---

## 11. React 19 — aprovechamiento

| Patrón | Estado | Oportunidad |
|---|---|---|
| Server Components | ✅ default | Reducir los 79 `'use client'` donde no haya interactividad |
| Server Actions | ✅ extenso (76 archivos) | Bien aprovechado |
| **Suspense** | ❌ 0 usos | **Streaming en PDP/PLP** (ver §5) |
| `useActionState` / `useFormStatus` | ⚠️ revisar | Formularios (checkout, contacto, newsletter) podrían usar estado nativo de acción |
| `useOptimistic` | ❌ | Carrito/wishlist: update optimista al añadir (UX instantánea) |

> `useOptimistic` en carrito y wishlist es un quick win de UX premium muy alineado con la marca.

---

## 12. Admin — optimizaciones

| Sección | Oportunidad |
|---|---|
| Dashboard | Streaming por widget (`<Suspense>` por tarjeta de métrica) — el dashboard hace ~8 queries en paralelo y bloquea |
| Analytics (orders/devoluciones) | Igual: cada gráfico en su `<Suspense>` con skeleton |
| Productos | `useOptimistic` al togglear destacado/archivar |
| Pedidos / Devoluciones | `refresh()` server-side tras cambio de estado |
| Newsletter | OK (acción puntual) |

---

## 13. Ecommerce — mejoras concretas

| Vista | Mejora v16 | Impacto |
|---|---|---|
| **Home** | `generateMetadata` + OG image dinámica; streaming de "más vendidos" | SEO + LCP |
| **PLP** | `generateMetadata` por categoría; streaming primer batch | SEO + perf |
| **PDP** | `generateStaticParams` para top productos (ISR); Suspense reviews/recomendados | SEO + LCP |
| **Carrito** | `useOptimistic` al modificar cantidades | UX |
| **Checkout** | `useActionState` en el form; mantener dinámico | UX/DX |
| **Cuenta** | OK (dinámico, auth) | — |
| **Wishlist** | `useOptimistic` al añadir/quitar | UX |

### SEO — gaps críticos para ecommerce

1. **No hay `sitemap.ts`** → crear dinámico con todos los productos/categorías. **Alto impacto.**
2. **No hay `robots.ts`** → crear (permitir catálogo, bloquear `/admin`, `/checkout`, `/orders`). **Alto.**
3. **`generateMetadata` solo en PDP** → añadir a home, PLP, categorías, colección. **Alto.**
4. **No hay `generateStaticParams`** → la PDP se renderiza on-demand siempre; pre-generar top N productos da TTFB casi-estático + mejor crawl. **Alto.**

---

## 14. MCP — Next.js DevTools

Next.js 16 trae **Next.js DevTools MCP** (`next-devtools-mcp`). Permite a agentes IA:
- inspeccionar el árbol de rutas y su estrategia de render (static/dynamic/cache)
- diagnosticar errores de hydration y prerender (justo los que aparecieron en esta migración)
- analizar performance de build

> **Recomendación:** añadir `.mcp.json` con `next-devtools-mcp@latest`. DX alto, riesgo nulo. Habría acelerado el debug de los hydration mismatches del React Compiler.

---

## 15. AGENTS.md — no existe

El proyecto **no tiene `AGENTS.md`** (sí tiene `CLAUDE.md` con identidad de marca). Para que agentes IA trabajen mejor, crear `AGENTS.md` con:

- **Arquitectura:** App Router, capas (ui/services/actions/repositories/hooks), separación Server/Client.
- **Convenciones reales del repo:** `revalidateTag`/`updateTag` (cuándo cada uno — ya documentado en `NEXTJS16-PHASE1-PREP.md`), patrón `auth.config.ts` + `auth.ts`, CSP en `proxy.ts` solo en prod, imágenes con fallback en cadena (`variant.color.images → ProductImage → ProductColors`).
- **Reglas de negocio:** stock por `ProductVariant`, cuarentena en devoluciones, ventanas legales (Ley 1480), Wompi como único gateway.
- **Gotchas v16:** classNames en una línea (React Compiler), `cacheComponents` revertido y por qué, Node 20.9+.

> Corregir además la mención obsoleta de **Framer Motion** en `CLAUDE.md` (no está instalado).

---

## RESULTADO — Roadmap priorizado

### Quick Wins (impacto alto, complejidad baja, riesgo bajo)
| # | Acción | Impacto | Riesgo |
|---|---|---|---|
| 1 | `sitemap.ts` + `robots.ts` dinámicos | SEO alto | Bajo |
| 2 | `generateMetadata` en home/PLP/categorías/colección | SEO alto | Bajo |
| 3 | Suspense streaming en PDP (reviews + recomendados) | LCP alto | Bajo |
| 4 | `updateTag('product:{slug}')` al crear review | Consistencia | Bajo |
| 5 | `@next/bundle-analyzer` + ranking real | DX | Nulo |
| 6 | `global-error.tsx` + `not-found.tsx` global con branding | UX/robustez | Bajo |
| 7 | `.mcp.json` con next-devtools-mcp | DX | Nulo |
| 8 | Crear `AGENTS.md` + corregir Framer Motion en CLAUDE.md | DX | Nulo |

### Impacto Medio (complejidad media)
| # | Acción | Impacto | Riesgo |
|---|---|---|---|
| 9 | `generateStaticParams` + ISR en PDP (top productos) | SEO + TTFB | Bajo-Medio |
| 10 | `useOptimistic` en carrito + wishlist | UX premium | Medio |
| 11 | Streaming por widget en dashboard/analytics admin | Perf admin | Bajo |
| 12 | `experimental.taint` para datos Prisma sensibles | Seguridad | Bajo |
| 13 | `experimental.inlineCss` + medir | FCP | Medio |
| 14 | `Link transitionType` PLP→PDP | UX | Bajo |
| 15 | Reducir `'use client'` innecesarios | Bundle | Medio |

### Impacto Alto (complejidad alta, hacer como proyectos aislados)
| # | Acción | Impacto | Riesgo |
|---|---|---|---|
| 16 | `cacheComponents` + `'use cache'` + PPR (resolver Footer/RootLayout primero) | Perf alto | Alto |
| 17 | `cachedNavigations` + `prefetchInlining` (medir uno a uno) | Perf navegación | Medio-Alto |
| 18 | Auditoría completa de bundle + code-splitting (Swiper, popups) | Bundle | Medio |

---

## Estrategias ideales (resumen)

**Caché ideal:** estático/cacheado para catálogo (home, PDP, categorías, colección) con `cacheTag` por entidad; dinámico para todo lo personal (carrito, checkout, cuenta, admin). Invalidación por `updateTag` en mutaciones admin (read-your-writes), `revalidateTag('max')` solo en crons.

**Invalidación ideal:** un tag por entidad (`product:{slug}`, `category:{slug}`, `nav`, `featured`, `coupons`). Cada Server Action invalida exactamente los tags que tocó — ni más (sobre-invalidación) ni menos (datos viejos). Hoy falta el de reviews.

**Performance ideal:** shell estático + islas en streaming (Suspense) para lo lento; ISR para catálogo; imágenes ya óptimas; medir cada flag experimental con Lighthouse antes de fijarlo.

**SEO ideal:** sitemap/robots dinámicos, `generateMetadata` en toda ruta pública, OG images, datos estructurados (Product schema.org) en PDP, ISR para crawl rápido.

---

## Notas de método

- Todos los flags experimentales citados fueron **verificados** contra `node_modules/next/dist/server/config-schema.js` del Next 16.2.7 instalado.
- `unstable_catchError` (solicitado) **no existe**; la API real es `unstable_rethrow`.
- `ViewTransition` de React **no está exportada** en React 19.2.6 instalado.
- `cacheComponents` se documenta como revertido con causa raíz, no como pendiente trivial.
- Nada de esto está implementado. Cada ítem requiere su PR y validación.
