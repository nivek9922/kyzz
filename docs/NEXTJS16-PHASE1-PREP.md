# KYZZ — Next.js 16 · Fase 1 (Preparación) — Resultados

> Ejecutado: 2026-06-02 · Rama: `feat/next16` · Estado: **Fase 1 completa**
> Continúa el plan de [NEXTJS16-MIGRATION-PLAN.md](./NEXTJS16-MIGRATION-PLAN.md).

---

## 1. Rama creada

```
feat/next16   (desde development)
```

Sin commits aún. Toda la implementación de Fases 2–4 vivirá aquí.

## 2. Verificación de entorno

| Requisito v16 | Estado actual | ¿Cumple? |
|---|---|---|
| **Node ≥ 20.9** | **v18.19.1** | ❌ **BLOQUEADOR** |
| TypeScript ≥ 5.1 | 5.2.2 | ✅ |
| npm compatible | 11.12.1 (avisa: no soporta Node 18) | ⚠️ depende de Node |

> 🔴 **Acción previa obligatoria a la Fase 2:** actualizar Node a **20.9+ LTS** (recomendado 20.x o 22.x) en entorno local **y** en CI/Vercel. Vercel usa Node 20+ por defecto; el riesgo real está en el entorno de desarrollo local (hoy en 18.19.1, ya fuera de soporte de npm 11). Sin esto, `next@16` ni siquiera arranca.

## 3. Baseline (antes de migrar)

`next build` ejecutado directo (sin `prisma migrate deploy`, no muta la DB). **Resultado: verde ✅.**

| Métrica | Valor (Next 15.5.18 / Node 18) |
|---|---|
| Rutas compiladas | 36 páginas + 10 API routes, todas OK |
| First Load JS compartido | **103 kB** |
| Middleware | **87.4 kB** (corre en edge hoy) |
| PDP `/product/[slug]` | 7.36 kB · 209 kB First Load |
| Admin producto `/admin/product/[slug]` | 8.05 kB · 219 kB First Load |
| Home `/` | 4 kB · 206 kB |

> ⚠️ **Nota:** v16 **elimina** las columnas `Size` y `First Load JS` del output de `next build` (las consideran imprecisas en arquitecturas RSC). Por eso la comparación post-migración **no** debe basarse en estos números, sino en **Lighthouse / Core Web Vitals** sobre PDP y checkout.

**Comandos de baseline a correr en entorno con DB (para Lighthouse):**
```bash
npm run build && npm start          # levantar prod local
# en otra terminal, contra PDP y checkout:
npx lighthouse http://localhost:3000/product/<slug> --output=json --output-path=./baseline-pdp.json
npx lighthouse http://localhost:3000/checkout --output=json --output-path=./baseline-checkout.json
```

**Hallazgo incidental (no bloqueante):** persiste la ruta `/gender/[gender]` en el build, residuo del campo `gender` ya eliminado del dominio. Candidata a borrado en limpieza aparte (no parte de esta migración).

## 4. Inventario y clasificación de `revalidateTag` (entregable central)

**12 call sites en 10 archivos.** Todos invalidan el tag `product:<slug>`, consumido por el cache de la PDP pública (`unstable_cache` en `app/(shop)/product/[slug]/page.tsx`).

### Criterio de clasificación

- **`updateTag(tag)`** — Server-Action-only. Expira el tag de inmediato, **sin servir stale**. Es lo más fiel a la semántica actual de v15 (`revalidateTag` purgaba y la siguiente lectura era fresca) **y** evita riesgo de sobreventa por stock desactualizado. **Recomendado por defecto.**
- **`revalidateTag(tag, 'max')`** — stale-while-revalidate (sirve dato viejo una vez y refresca en background). Es un **cambio de comportamiento** vs v15. Solo donde `updateTag` no es invocable (contexto de route/cron) **y** la dirección de la staleness sea segura.

### Tabla de decisión

| Archivo | Línea(s) | Contexto de ejecución | Recomendación |
|---|---|---|---|
| `actions/order/place-order.ts` | 180 | Server Action (checkout) — **descuenta stock** | **`updateTag`** (correctitud) |
| `actions/order/create-manual-order.ts` | 140 | Server Action admin — descuenta stock | **`updateTag`** |
| `actions/order/cancel-unpaid-orders.ts` | 95 | **Compartido con cron** `/api/cron/cancel-orders` — restaura stock | **`revalidateTag(tag,'max')`** ⚠️ forzado (updateTag no existe en route handler) |
| `actions/product/manage-product-variants.ts` | 121 | Server Action admin — edita stock/variantes | **`updateTag`** |
| `actions/product/create-update-product.ts` | 128 | Server Action admin — crea/edita producto | **`updateTag`** |
| `actions/product/toggle-product-featured.ts` | 32 | Server Action admin — destacar | **`updateTag`** |
| `actions/product/manage-product-color.ts` | 55, 101, 141, 172 | Server Action admin — colores/imágenes (×4) | **`updateTag`** ×4 |
| `actions/product/convert-product-type.ts` | 40 | Server Action admin — estructura + sync stock | **`updateTag`** |
| `actions/product/delete-product-image.ts` | 50 | Server Action admin — borra imagen | **`updateTag`** |
| `actions/return/update-return-status.ts` | 240 | Server Action admin — restock en ACCEPTED | **`updateTag`** (`'max'` también aceptable: restaurar stock es "under-promising") |

**Resumen:** 11 sitios → `updateTag` · 1 sitio (`cancel-unpaid-orders`) → `revalidateTag(tag,'max')` forzado.

### Notas de implementación para Fase 3

- `revalidatePath(...)` **no cambia** en v16 (sigue con un solo argumento). Solo se tocan las líneas de `revalidateTag`. Estos archivos ya llaman `revalidatePath` además del tag — se conserva igual.
- `import { revalidateTag } from 'next/cache'` → añadir `updateTag` al import donde aplique.
- `cancel-unpaid-orders.ts`: como `runCancelUnpaidOrders` se llama desde el route `/api/cron/cancel-orders`, **no** convertir a `updateTag` ahí — usar `revalidateTag(p.slug, 'max')`.
- El `unstable_cache` de la PDP es candidato a migrar a `'use cache'` + `cacheTag` en **Fase 4** (Cache Components); mientras siga como `unstable_cache`, el tagging por `cacheTag`/`revalidateTag` debe permanecer consistente.

## 5. Checklist de salida de Fase 1

- [x] Rama `feat/next16` creada
- [x] Entorno verificado → **bloqueador: Node 18 → subir a 20.9+**
- [x] Baseline de build capturado (verde; JS compartido 103 kB, middleware 87.4 kB)
- [x] Comandos de baseline Lighthouse documentados (pendiente ejecutarlos en entorno con DB)
- [x] 12 `revalidateTag` inventariados y clasificados (11 `updateTag` / 1 `revalidateTag 'max'`)

## 6. Pre-requisito antes de Fase 2

1. **Subir Node a 20.9+** (local + CI/Vercel). — *bloqueante*
2. (Opcional, recomendado) correr el baseline Lighthouse para tener el "antes" de Core Web Vitals.

Con eso resuelto, Fase 2 (bump de dependencias + Turbopack scripts + ESLint flat) puede arrancar.
