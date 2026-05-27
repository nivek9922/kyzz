# Rediseño Homepage Premium — KYZZ

> Guía viva de implementación. Trabajamos **una sección a la vez**: revisar → corregir → aprobar → avanzar.

## Objetivo

Transformar la home en un ecommerce **premium, editorial, fashion-luxury y mobile-first** (refs: Zara, COS, Mango, Alo Yoga, Nude Project): más contenido visual, mejor storytelling, video hero administrable, secciones que aumenten engagement y conversión. Server/Client bien separados, performance-first (LCP, CLS, JS mínimo), consistencia visual total.

Decisiones tomadas: secciones nuevas = **Brand Story** + **Best Sellers**; video hero en **Cloudinary**; empezar por **Categorías**.

---

## Sistema de diseño (consistencia OBLIGATORIA)

- **Contenedor:** `max-w-7xl mx-auto px-6`. Padding sección `py-12 md:py-20`. Tiras full-bleed con `pl-6`.
- **Header de sección:** `<p>` etiqueta (`text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-2`) + `<h2>` (`font-serif text-3xl text-kyzz-dark`) + `<div class="kyzz-divider-left mt-4" />`. Enlace "Ver todo": `text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary`.
- **Paleta:** tokens `kyzz-dark/muted/primary/secondary/tertiary/neutral`.
- **Tipografía:** títulos `font-serif`; labels uppercase con tracking.
- **Imágenes:** `aspect-[3/4]` en productos; `ProductGridItem` compartido; `sizes` correcto; `priority` solo en el LCP (hero).
- **Rendimiento:** `'use client'` solo en islas interactivas; lo estático = server component. Respetar `prefers-reduced-motion`.

---

## Decisiones técnicas globales

1. **Server-first:** secciones en server component; client solo en islas (slider categorías, controles video). Datos en `page.tsx` con `Promise.all`.
2. **Imágenes:** Cloudinary + `next/image`, `sizes` por breakpoint, lazy salvo hero.
3. **Categorías mobile:** scroll-snap nativo (`overflow-x-auto snap-x snap-mandatory`, item `w-full snap-center`) → swipe táctil real. Autoplay off por defecto, sujeto a `prefers-reduced-motion`.
4. **Video hero — upload firmado directo a Cloudinary:** evita el límite de body de Vercel (~4.5MB). Action firma server-side (admin) → cliente sube directo a Cloudinary (`resource_type:video`) → action guarda `secure_url`+poster. (El upload de imágenes sigue pasando por el server.)
5. **Video hero — reproducción:** `<video autoPlay muted loop playsInline>` + `poster` (LCP=poster), aspect fijo (CLS 0), fallback video→imagen→"K". `prefers-reduced-motion`/`Save-Data` → solo poster.
6. **Migraciones incrementales:** una por sección.

---

## Orden y propósito de las secciones (home final)

| # | Sección | Componente | Propósito | Estado |
|---|---------|-----------|-----------|--------|
| 1 | Hero (video) | `page.tsx` inline | Impacto marca + CTA | ⏳ Fase 4 |
| 2 | Categorías | `HomeCategorySection` | Navegación por categoría | 🔍 **EN CURSO (Fase 1)** |
| 3 | New Arrivals | `HomeNewArrivalsSection` | Novedad de inventario | ⏳ Fase 2 |
| 4 | Colección Especial | `HomeFeaturedSection` | Curaduría / destacados | ⏳ Fase 3 |
| 5 | Brand Story | `HomeEditorialSplit` | Storytelling de marca | ⏳ Fase 5 |
| 6 | Best Sellers | `HomeBestSellersSection` | Prueba social / impulso | ⏳ Fase 6 |
| 7 | Viste recientemente | `HomeRecentlyViewed` | Personalización | ✅ existe |

---

## Roadmap por fases (orden de construcción)

### Fase 0 — Setup
- Persistir este plan en `docs/plan-home.md`.
- Eliminar los badges "Calidad / Diseño / Precio" de `page.tsx`.

### Fase 1 — Categorías ⭐ (en curso)
- Schema: `Category.imageUrl String?`.
- Action `updateCategoryImage(id, file)` (admin, MIME whitelist, ≤7MB, Cloudinary `kyzz/categories` 3:4, borra anterior, revalida `/`).
- `getCategories` devuelve `imageUrl`.
- Admin `CategoryManager`: subida de imagen por categoría.
- `HomeCategorySection`: mobile snap-swipe 1-up + nombre; desktop grid 4 con hover; fallback sin imagen.
- `page.tsx`: cargar categorías y montar tras el hero.

### Fase 2 — New Arrivals
- Action `getNewArrivals(8)` (orderBy createdAt desc, !archived, inStock>0, patrón featured).
- `HomeNewArrivalsSection` reutilizando `ProductGridItem`. Mobile 2 col, desktop grid. SSR.

### Fase 3 — Colección Especial (optimizar)
- Extraer a `HomeFeaturedSection` (server). Revisar sizes, a11y, animaciones. Sin schema.

### Fase 4 — Hero Video
- Schema: `SiteConfig.heroVideoUrl`, `heroPosterUrl`.
- Admin: firma Cloudinary + upload directo + guardar url/poster.
- Hero `<video>` + poster, aspect fijo, fallbacks, reduced-motion.

### Fase 5 — Brand Story editorial
- Schema: `SiteConfig.brandStoryImageUrl`, `brandStoryText`.
- Admin: imagen + texto. `HomeEditorialSplit` (50/50 desktop, apilado mobile). Reemplaza la cita.

### Fase 6 — Best Sellers
- Action `getBestSellers(8)` (agregación OrderItem por productId sobre órdenes pagadas).
- Fallback sin ventas → recientes/destacados u ocultar.
- `HomeBestSellersSection` reutilizando `ProductGridItem`.

---

## Checklist por sección (gate antes de avanzar)

- [ ] Mobile fluido, touch real, tap targets ≥ 40px.
- [ ] Desktop alineado al sistema de diseño.
- [ ] Performance: sizes/lazy correctos, priority solo hero, client solo si hace falta, CLS 0.
- [ ] Accesibilidad: aria-label, foco, prefers-reduced-motion, alt.
- [ ] Seguridad: actions con auth() admin + validación + whitelist uploads.
- [ ] `npx tsc --noEmit` limpio + probado en navegador (mobile + desktop).

---

## Bitácora

- **2026-05-25** — Plan aprobado. Árbol reseteado a `c968269` limpio (trabajo previo de la home descartado). Inicia Fase 0 + Fase 1 (Categorías).
