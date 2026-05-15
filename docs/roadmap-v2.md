# Plan: KYZZ — Roadmap de producto v2

## Contexto

KYZZ tiene una base técnica sólida: Next.js 15, React 19, Prisma 5/PostgreSQL, NextAuth v5, Cloudinary, PayPal, Zustand v5, Sonner, GA4. La identidad visual está definida y el flujo core (catálogo → producto → carrito → checkout → pago) funciona en producción.

Este plan cubre las **12 mejoras de experiencia de compra** identificadas al analizar referentes (Naty London, Shopify stores), organizadas en feature branches sobre una rama `development`.

---

## Estado actual post-exploración

| Área | Estado |
|------|--------|
| `Category.slug` | ✅ Ya en schema |
| `Order.shippingStatus / trackingCode` | ✅ Ya en schema |
| `Subscriber` model | ✅ Ya en schema |
| `product-pagination.ts` filtros (sizes, price, sort) | ✅ Ya implementado |
| `ProductFilters` component | ✅ Ya existe (exportado desde components/index.ts) |
| Admin detalle de orden / estados de envío | ⚠️ Pendiente de verificar |
| Admin categorías | ⚠️ Pendiente de verificar |
| Email transaccional (Resend) | ❌ Pendiente |
| Color de producto | ❌ No existe |
| Formato precio COP con decimales | ❌ Actualmente sin decimales (`$50.000`) |

---

## Estrategia de ramas

```
main          ← producción (solo merges desde development)
  └── development   ← integración y staging
        ├── feature/f01-grid-layouts
        ├── feature/f02-color-variants
        ├── feature/f03-product-tabs
        └── feature/fNN-...
```

**Reglas:**
- Cada feature nace desde `development`, se trabaja completo, hace PR a `development`
- Cuando un conjunto de features pasa QA → merge de `development` a `main` y deploy
- Una feature a la vez: no iniciar la siguiente hasta completar y cerrar el PR de la actual
- Commits: `feat(f01):`, `fix(f01):`, `chore:` — prefijo con número de feature

---

## Las 12 Features — Priorizadas

### Prioridad: Rápidas (1–3 días)

---

### F01 — Selector de columnas en grid de productos

**Rama:** `feature/f01-grid-layouts`
**Complejidad:** Baja

**Qué hace:** Toggle visual en la página de listado para cambiar entre 2, 3 y 6 columnas. La preferencia se guarda en localStorage.

**Archivos a modificar:**
- `src/app/(shop)/products/page.tsx` — pasar el layout como prop al grid
- `src/components/product/ProductGrid.tsx` — aceptar prop `columns: 2 | 3 | 6`
- **Nuevo:** `src/components/product/GridLayoutSelector.tsx` — botones de icono con Lucide (LayoutGrid, Grid3x3, List)

**Implementación:**
```typescript
// GridLayoutSelector.tsx — Client Component
const layouts = [
  { cols: 2, icon: 'Columns2' },
  { cols: 3, icon: 'LayoutGrid' },
  { cols: 6, icon: 'Grid3x3' },
];
// Persiste en localStorage("kyzz-grid-cols"), default: 3
```

```typescript
// ProductGrid.tsx — aceptar columns prop
const colsMap = { 2: 'grid-cols-2', 3: 'grid-cols-2 md:grid-cols-3', 6: 'grid-cols-3 md:grid-cols-6' };
```

**Verificación:** Abrir `/products`, cambiar a 6 columnas → grid se actualiza. Recargar página → preferencia persiste.

---

### F03 — Tabs expandibles en detalle de producto

**Rama:** `feature/f03-product-tabs`
**Complejidad:** Baja

**Qué hace:** Sección de acordeón debajo de la descripción con: Guía de tallas, Envíos, Cambios y garantías, Métodos de pago.

**Archivos a modificar:**
- `src/app/(shop)/product/[slug]/page.tsx` — agregar `<ProductTabs />` después de la descripción
- **Nuevo:** `src/app/(shop)/product/[slug]/ui/ProductTabs.tsx` — Client Component

**Contenido (estático en primera iteración):**
```typescript
const TABS = [
  { id: 'sizes',   label: 'Guía de tallas',      content: '...' },
  { id: 'shipping',label: 'Envíos',               content: 'Envíos a todo Colombia 5-8 días hábiles...' },
  { id: 'returns', label: 'Cambios y garantías',  content: '30 días para cambios con etiqueta intacta...' },
  { id: 'payment', label: 'Métodos de pago',      content: 'PayPal, tarjeta de crédito/débito...' },
];
```

Animación con `framer-motion` (AnimatePresence + motion.div) para el contenido expandible.

**Verificación:** Click en "Guía de tallas" → expande con animación suave. Click en otro → anterior se cierra.

---

### F11 — Formato de precio colombiano con decimales

**Rama:** `feature/f11-price-format`
**Complejidad:** Muy baja

**Qué hace:** Cambia `$50.000` → `$50.000,00` (formato COP estándar con centavos).

**Archivo a modificar:**
- `src/utils/currencyFormat.ts` — cambiar `minimumFractionDigits: 0` a `2`

```typescript
// Antes: { minimumFractionDigits: 0, maximumFractionDigits: 0 }
// Después:
export const currencyFormat = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
```

**Nota:** El cambio es global — afecta carrito, checkout, órdenes, admin.

**Verificación:** Ir a `/cart` → ver precio como `$50.000,00`.

---

### F05 — Barra de progreso para envío gratis

**Rama:** `feature/f05-free-shipping`
**Complejidad:** Baja

**Qué hace:** Muestra en el carrito y en el mini-cart cuánto falta para obtener envío gratis. Ej: "Te faltan $30.000 para envío gratis".

**Archivos a modificar:**
- `src/config/constants.ts` — agregar `FREE_SHIPPING_THRESHOLD = 150000`
- `src/app/(shop)/cart/ui/OrderSummary.tsx` — agregar `<FreeShippingBar />`
- **Nuevo:** `src/components/ui/FreeShippingBar.tsx` — Client Component con barra animada

```typescript
// FreeShippingBar.tsx
const progress = Math.min((subTotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
// Si progress >= 100: "¡Envío gratis!" en verde
// Si no: "Te faltan {currencyFormat(remaining)} para envío gratis"
// <div className="h-1 bg-kyzz-primary" style={{ width: `${progress}%` }} />
```

**Verificación:** Agregar producto al carrito → ver barra con porcentaje correcto. Superar umbral → mensaje "¡Envío gratis!".

---

### F09 — Claridad en precios con IVA

**Rama:** `feature/f09-tax-clarity`
**Complejidad:** Baja-Media

**Qué hace:** Mostrar en la página de producto "Precio incluye IVA" o mostrar precio base vs IVA por separado según política del negocio.

**Contexto:** En Colombia la ropa con precio > $868.000 paga IVA del 19%. Ropa de menor precio está exenta. KYZZ actualmente calcula 15% de forma artificial. Hay dos opciones:

- **Opción A (recomendada):** Mostrar precios con IVA incluido, label "IVA incl." junto al precio. Eliminar la línea "Impuestos (15%)" del resumen y sumarla al subtotal.
- **Opción B:** Mantener IVA separado pero corregir el porcentaje a 19% y añadir tooltip explicativo.

**Archivos a modificar:**
- `src/config/constants.ts` — actualizar `TAX_RATE` si aplica
- `src/app/(shop)/product/[slug]/page.tsx` — agregar label de IVA
- `src/app/(shop)/cart/ui/OrderSummary.tsx` — ajustar display
- `src/app/(shop)/checkout/(checkout)/ui/PlaceOrder.tsx` — ajustar display

**Acción requerida del usuario:** Confirmar qué opción de IVA usar antes de implementar.

---

### Prioridad: Media (3–5 días)

---

### F08 — Wishlist (lista de deseos)

**Rama:** `feature/f08-wishlist`
**Complejidad:** Media

**Qué hace:** Corazón en cada producto que guarda/quita de favoritos. Página `/wishlist` con todos los productos guardados. Acceso desde navbar o menú usuario.

**Archivos nuevos:**
- `src/store/wishlist/wishlist-store.ts` — Zustand + persist localStorage
- `src/components/product/WishlistButton.tsx` — Client Component (corazón toggle)
- `src/app/(shop)/wishlist/page.tsx` — página de wishlist
- `src/app/(shop)/wishlist/ui/WishlistGrid.tsx`

**Archivos modificados:**
- `src/components/product/ProductGridItem.tsx` — agregar `<WishlistButton />` overlay
- `src/components/ui/top-menu/TopMenu.tsx` — agregar link wishlist (ícono corazón)

**Prisma (opcional — para usuarios autenticados):**
Si se quiere persistir en BD para sync entre dispositivos:
```prisma
model Wishlist {
  id        String   @id @default(uuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  products  Product[]
}
```
Primera iteración: **solo localStorage** (simpler, faster). BD en segunda iteración.

**Store:**
```typescript
interface WishlistState {
  items: string[];  // product IDs
  toggle: (id: string) => void;
  has:    (id: string) => boolean;
  clear:  () => void;
}
```

**Verificación:** Click corazón en producto → corazón se rellena. Ir a `/wishlist` → producto aparece. Recargar → persiste. Quitar → desaparece de la lista.

---

### F10 — Recomendaciones en el carrito

**Rama:** `feature/f10-cart-recommendations`
**Complejidad:** Media

**Qué hace:** Sección "También te puede gustar" al final del carrito con 4 productos relacionados (misma categoría que algún producto en carrito, excluyendo los que ya están).

**Archivos nuevos:**
- `src/actions/product/get-related-products.ts` — Server Action
- `src/app/(shop)/cart/ui/CartRecommendations.tsx` — Client Component

**Archivos modificados:**
- `src/app/(shop)/cart/page.tsx` — agregar `<CartRecommendations />`

**Action:**
```typescript
// get-related-products.ts
export async function getRelatedProducts(cartProductIds: string[]) {
  // 1. Obtener categoryId de productos en carrito
  // 2. Query: productos de esas categorías, excluir cartProductIds, take: 4, random order
  const products = await prisma.product.findMany({
    where: {
      id: { notIn: cartProductIds },
      category: { id: { in: categoryIds } },
      inStock: { gt: 0 },
    },
    include: { productImages: { take: 1 } },
    take: 4,
    orderBy: { createdAt: 'desc' },
  });
}
```

**UI:** Scroll horizontal en mobile, grid 4 columnas en desktop. `<ProductGridItem>` existente.

**Verificación:** Agregar producto al carrito → scroll hasta abajo → ver 4 recomendaciones de la misma categoría, sin duplicar los del carrito.

---

### F12 — Búsqueda avanzada con imágenes y precios

**Rama:** `feature/f12-advanced-search`
**Complejidad:** Media

**Qué hace:** Al escribir en el buscador, aparece un dropdown inline con resultados en tiempo real: imagen miniatura, nombre, precio, categoría. Debounce de 300ms.

**Archivos a modificar:**
- `src/components/ui/top-menu/SearchOverlay.tsx` — agregar resultados en tiempo real
- `src/actions/product/search-products.ts` — ya existe, reutilizar tal cual (devuelve imágenes)

**Implementación:**
```typescript
// SearchOverlay.tsx — agregar estado de resultados
const [results, setResults] = useState<SearchProduct[]>([]);
const [isSearching, setIsSearching] = useState(false);

// useEffect con debounce 300ms sobre el valor del input
useEffect(() => {
  if (query.length < 2) { setResults([]); return; }
  const timer = setTimeout(async () => {
    setIsSearching(true);
    const data = await searchProducts(query);
    setResults(data);
    setIsSearching(false);
  }, 300);
  return () => clearTimeout(timer);
}, [query]);
```

**UI del dropdown:**
- Imagen 48x56px + nombre + categoría + precio
- Skeleton loading durante búsqueda
- Max 6 resultados, link "Ver todos los resultados →"
- Click en resultado → navega al producto, cierra overlay

**Verificación:** Escribir "jean" → aparecen cards con imagen y precio en menos de 500ms. Click en un resultado → navega a `/product/[slug]`.

---

### F07 — Popup de newsletter con descuento

**Rama:** `feature/f07-newsletter-popup`
**Complejidad:** Media

**Qué hace:** Popup que aparece después de 8 segundos (o al intentar salir), ofreciendo 10% de descuento a cambio del email. Se guarda en localStorage si ya fue visto/cerrado.

**Archivos nuevos:**
- `src/components/ui/NewsletterPopup.tsx` — Client Component
- `src/actions/site/subscribe-newsletter.ts` — ya puede estar en part del plan anterior

**Archivos modificados:**
- `src/app/layout.tsx` o `src/components/Providers.tsx` — montar `<NewsletterPopup />`

**Lógica del popup:**
```typescript
// NewsletterPopup.tsx
useEffect(() => {
  const seen = localStorage.getItem('kyzz-newsletter-popup');
  if (seen) return;
  const timer = setTimeout(() => setOpen(true), 8000);
  return () => clearTimeout(timer);
}, []);

const onDismiss = () => {
  localStorage.setItem('kyzz-newsletter-popup', 'dismissed');
  setOpen(false);
};
```

**Código de descuento:** Primera iteración → mostrar código fijo "KYZZ10" en el popup post-suscripción (sin sistema de validación de cupones todavía). El código de cupones es F13 (backlog).

**UI:** Modal centrado con imagen de fondo, título grande serif "10% de descuento", input email, botón, X para cerrar.

**Verificación:** Primera visita → popup aparece a los 8s. Cerrar → no vuelve a aparecer. Suscribirse → muestra código "KYZZ10".

---

### Prioridad: Alta complejidad (5–10+ días)

---

### F02 — Variantes de color en productos

**Rama:** `feature/f02-color-variants`
**Complejidad:** Alta (schema migration)

**Qué hace:** Un mismo modelo de producto existe en varios colores, cada uno con sus propias imágenes. En el detalle se muestran swatches de color. Al seleccionar un color, cambian las imágenes pero el usuario permanece en la misma URL.

**Enfoque:** Cada color es un producto independiente en BD, vinculados por un `variantGroupId` compartido.

**Prisma — cambios:**
```prisma
model Product {
  // ... campos existentes ...
  color           String?          // "Negro", "Blanco", "Beige"
  colorHex        String?          // "#000000" para el swatch
  variantGroupId  String?          // UUID compartido entre variantes del mismo modelo
  variants        Product[]        @relation("ProductVariants", fields: [variantGroupId], references: [variantGroupId])
  // Nota: self-relation en Prisma requiere un campo auxiliar
}
```

**Alternativa más simple (recomendada para primera iteración):**
```prisma
model ProductColorVariant {
  id          String  @id @default(uuid())
  productId   String
  product     Product @relation(fields: [productId], references: [id])
  colorName   String  // "Negro"
  colorHex    String  // "#000000"
  slug        String  @unique  // slug del producto de ese color
}
```
Cada producto es autónomo. El componente `ColorSwatches` consulta `ProductColorVariant` para mostrar los otros colores, navigando al slug correspondiente.

**Archivos nuevos:**
- `src/actions/product/get-product-color-variants.ts`
- `src/app/(shop)/product/[slug]/ui/ColorSwatches.tsx`

**Archivos modificados:**
- `prisma/schema.prisma`
- `src/app/(shop)/product/[slug]/page.tsx`
- `src/app/(shop)/admin/productos/[id]/page.tsx` — agregar campos de color en el form

**Verificación:** Producto "Jean Tiro Alto" tiene 3 colores → ver 3 swatches en el detalle. Click en swatch azul → navega al producto azul manteniendo el sizeSelector. Filtro de color en `/products?color=negro` muestra solo esos.

---

### F06 — Checkout como invitado

**Rama:** `feature/f06-guest-checkout`
**Complejidad:** Alta (flujo de auth + pagos)

**Qué hace:** Permite completar una compra sin cuenta. El usuario proporciona su email en el checkout. La orden queda registrada con ese email pero sin `userId`.

**Cambios en Prisma:**
```prisma
model Order {
  // ... campos existentes ...
  userId      String?    // Nullable para invitados
  guestEmail  String?    // Email del invitado
  user        User?      @relation(fields: [userId], references: [id])
}
```

**Flujo:**
1. En `/checkout/address` → si no autenticado, mostrar campo "Email" (requerido) antes del formulario de dirección
2. En `placeOrder` server action → aceptar `guestEmail` opcional, crear orden sin `userId`
3. En PayPal callback → el comprobante de pago se envía al `guestEmail`
4. Los invitados no pueden ver historial de órdenes (excepto con link directo desde email)

**Archivos modificados:**
- `src/actions/order/place-order.ts` — aceptar `guestEmail`, nullable `userId`
- `src/app/(shop)/checkout/address/ui/AddressForm.tsx` — campo email para invitados
- `src/app/(shop)/checkout/(checkout)/ui/PlaceOrder.tsx` — pasar email al action
- `prisma/schema.prisma`
- `src/app/(shop)/orders/page.tsx` — solo mostrar órdenes de usuarios autenticados

**Consideración:** NextAuth v5 — remover el `auth()` redirect en `/checkout/address` o hacerlo opcional.

**Verificación:** Ir a carrito sin sesión → checkout → completar orden con email → llega confirmación al email. Ir a `/orders` → no aparece (es de invitado).

---

### F04 — Métodos de pago colombianos

**Rama:** `feature/f04-colombian-payments`
**Complejidad:** Alta (gateway integration)

**Qué hace:** Integrar Wompi como gateway colombiano principal, reemplazando o complementando PayPal. Wompi soporta: tarjeta débito/crédito, PSE, Nequi, Bancolombia a la mano.

**Gateway recomendado:** Wompi (Bancolombia) — https://docs.wompi.co
- Plan: 2.99% + $900 por transacción tarjeta, PSE gratis
- Sin mensualidad
- SDK oficial: `@wompi-co/sdk` (o integración manual via API REST)

**Variables de entorno a agregar:**
```env
WOMPI_PUBLIC_KEY=pub_prod_xxxx
WOMPI_PRIVATE_KEY=prv_prod_xxxx
WOMPI_EVENTS_SECRET=xxx   # para webhooks
```

**Flujo de pago Wompi:**
1. Frontend: Crear "transaction" via Wompi Widget o API
2. Backend (webhook): `/api/wompi/webhook` → verificar firma → marcar orden como pagada
3. Redirect: Wompi redirige a `/orders/[id]?wompi_ref=xxx` → mostrar estado

**Archivos nuevos:**
- `src/app/api/wompi/webhook/route.ts` — endpoint de webhook
- `src/actions/payment/wompi-checkout.ts` — crear transacción
- `src/components/paypal/WompiButton.tsx` — botón de pago

**Archivos modificados:**
- `src/app/(shop)/orders/[id]/ui/OrderStatus.tsx` — mostrar botón Wompi si no pagada
- `src/actions/order/update-order-paid.ts` — reutilizar o crear versión Wompi

**Requerimiento del usuario:** Crear cuenta en Wompi Dashboard → obtener keys de producción y sandbox.

**Verificación (sandbox):** Completar orden → click "Pagar con Wompi" → usar tarjeta test → webhook recibido → orden marcada como pagada.

---

## Resumen por prioridad

| # | Feature | Rama | Complejidad | Requiere usuario |
|---|---------|------|-------------|-----------------|
| F11 | Formato precio COP con decimales | `f11-price-format` | Muy baja | — |
| F01 | Selector columnas grid | `f01-grid-layouts` | Baja | — |
| F03 | Tabs en detalle de producto | `f03-product-tabs` | Baja | — |
| F05 | Barra envío gratis | `f05-free-shipping` | Baja | Confirmar umbral $ |
| F09 | Claridad IVA | `f09-tax-clarity` | Baja | Confirmar política IVA |
| F08 | Wishlist | `f08-wishlist` | Media | — |
| F10 | Recomendaciones en carrito | `f10-cart-recommendations` | Media | — |
| F12 | Búsqueda con imágenes y precios | `f12-advanced-search` | Media | — |
| F07 | Popup newsletter + descuento | `f07-newsletter-popup` | Media | Configurar Resend (o sin email) |
| F02 | Variantes de color | `f02-color-variants` | Alta | — |
| F06 | Checkout como invitado | `f06-guest-checkout` | Alta | — |
| F04 | Pagos colombianos (Wompi) | `f04-colombian-payments` | Alta | Keys Wompi |

---

## Backlog (no en scope, para futuro)

- **F13** — Sistema de cupones de descuento (complementa F07)
- **F14** — Reviews y puntuaciones de productos
- **F15** — Tallas internacionales en guía (EU, UK, US)
- **F16** — Email transaccional con Resend (ver plan anterior FASE 3A)
- **F17** — Categorías administrables con slug (ver plan anterior FASE 1A — verificar si ya está)
- **F18** — Dashboard admin mejorado con métricas de envío (ver plan anterior FASE 2B)

---

## Archivos críticos de referencia

| Archivo | Para |
|---------|------|
| `prisma/schema.prisma` | F02, F06, F08 (BD wishlist) |
| `src/utils/currencyFormat.ts` | F11 |
| `src/components/product/ProductGridItem.tsx` | F01, F08 |
| `src/app/(shop)/product/[slug]/page.tsx` | F03, F02, F09 |
| `src/app/(shop)/cart/page.tsx` + `ui/OrderSummary.tsx` | F05, F10 |
| `src/components/ui/top-menu/SearchOverlay.tsx` | F12 |
| `src/actions/product/search-products.ts` | F12 (reutilizar) |
| `src/actions/order/place-order.ts` | F06 |
| `src/config/constants.ts` | F05, F09, F11 |
| `src/store/cart/cart-store.ts` | F05, F10 |

---

## Notas técnicas

- **F01 localStorage:** Usar `useEffect` para leer preferencia (evitar hydration mismatch en SSR).
- **F03 framer-motion:** Ya está instalado en el proyecto — reutilizar `AnimatePresence`.
- **F05 umbral:** Proponer `FREE_SHIPPING_THRESHOLD = 150_000` COP por defecto, configurable en `SiteConfig` (BD) después.
- **F08 wishlist:** Primera iteración solo localStorage. Si el usuario quiere sync por cuenta, agregar el modelo Prisma en iteración 2.
- **F10 recomendaciones:** No necesita ML ni algoritmo complejo — misma categoría + `orderBy: { createdAt: 'desc' }` es suficiente para primera iteración.
- **F12 debounce:** Implementar manualmente con `setTimeout/clearTimeout` (sin librería adicional).
- **F06 auth:** Revisar el middleware de NextAuth v5 para que `/checkout/address` no redirija a login si no hay sesión.
- **F04 Wompi:** Requiere dominio verificado para webhooks. En desarrollo usar ngrok o Vercel preview URL.
