# Auditoría Pre-Lanzamiento — KYZZ Ecommerce

> Análisis estratégico y brutalmente honesto antes del lanzamiento real.
> Hallazgos **verificados leyendo el código** (no solo exploración superficial).
> Stack: Next.js 15.5 · React 19.2 · TS strict · Prisma 5.22 · NextAuth v5-beta · Wompi · Resend · GA4 · Cloudinary · Zustand 5.

---

## Contexto

KYZZ va a abrir pagos reales. El core (catálogo → carrito → checkout → Wompi → orden → email) funciona en producción. Esta auditoría existe para responder: **¿qué nos falta, qué está mal y qué nos puede explotar cuando entren clientes y dinero real?**

**Parámetros del negocio (definidos por el dueño):**
- **Lanzamiento:** sin fecha fija → roadmap completo priorizado, ejecutable a su ritmo.
- **Operación:** dueño + asistente (no técnico) → backoffice usable + automatización que reduzca trabajo manual.
- **Testing:** cobertura seria → unit + integración + E2E del checkout.

**Lo que YA está bien (no tocar):** firma de integridad Wompi server-side, webhook con verificación de firma, reference única por intento, cálculo de precios/totales/stock server-side dentro de transacción, CSP con nonce, secrets server-only, embudo GA4 completo, la mayoría de actions admin con `auth()`, timezone COT corregido, toasts Sonner consistentes.

---


## Resumen ejecutivo (severidad verificada)

| # | Hallazgo | Severidad | Estado |
|---|----------|-----------|--------|
| S1 | `createUpdateProduct` y `deleteProductImage` sin `auth()` | 🔴 CRÍTICO | Confirmado leyendo archivos |
| S2 | Sin rate-limit en login/register/newsletter/contact | 🟠 ALTO | Confirmado |
| S3 | Upload sin whitelist de MIME server-side | 🟠 ALTO | Confirmado |
| S4 | Código muerto de PayPal aumenta superficie de ataque | 🟡 MEDIO | Confirmado (PayPal ya removido de UI) |
| S5 | Cupón: incremento de `usageCount` no atómico (TOCTOU) | 🟡 MEDIO | Confirmado |
| A1 | Sin índices DB en `categoryId`, `isPaid/paidAt`, `shippingStatus` | 🟠 ALTO | Confirmado en schema |
| A2 | PDP cacheada 7 días sin `revalidateTag` → stock/precio stale | 🟠 ALTO | Confirmado |
| A3 | Sin `error.tsx` global ni en `/admin/*` | 🟡 MEDIO | Confirmado |
| O1 | Stock se descuenta al crear orden (antes de pagar); cancelación manual | 🟠 ALTO | Confirmado |
| B1 | Dashboard admin sin métricas de negocio (best-sellers, AOV, tendencia) | 🟠 ALTO | Confirmado |
| U1 | Búsqueda y filtros sin debounce | 🟡 MEDIO | Confirmado |
| U2 | Carrito sin empty state diseñado | 🟡 MEDIO | Confirmado |
| T1 | Cero tests, cero CI | 🟠 ALTO | Confirmado |

**Correcciones a la exploración inicial (los agentes exageraron):**
- ❌ "27 de 51 actions sin auth" → en realidad solo **2 mutaciones admin** sin auth; el resto son lecturas públicas o endpoints públicos por diseño.
- ❌ "paypalCheckPayment permite marcar pagado adivinando UUID" → falso, está gated por la API real de PayPal.
- ❌ "Analytics incompleto/CRÍTICO" → el embudo GA4 (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `search`) **ya existe** en `src/lib/gtag.ts`.
- ❌ "Coupon abuse CRÍTICO" → `validateCoupon` sí exige `auth()` y verifica uso previo; solo queda el race del contador global.

---

## Hallazgos por área

### 1. Seguridad

**🔴 S1 — Dos mutaciones admin sin autorización (BLOQUEADOR).**
`src/actions/product/create-update-product.ts:28` y `src/actions/product/delete-product-image.ts:9` validan con Zod pero **nunca llaman `auth()`**. Las Server Actions son endpoints POST invocables directamente; `middleware.ts` solo inyecta CSP y `admin/layout.tsx:36` solo protege el *renderizado de página*. Un atacante puede crear/editar productos y borrar imágenes de Cloudinary sin sesión.
Es un **olvido en exactamente 2 archivos** — sus hermanas (`delete-product`, `toggle-product-featured`, `manage-product-color`, `manage-product-variants`) sí tienen auth.
**Fix:** crear helper `assertAdmin()` en `src/lib/auth-guard.ts` y aplicarlo. Auditar de paso que cada action admin verifique `role === 'admin'` (no solo sesión presente).

**🟠 S2 — Endpoints públicos sin rate-limit.** `auth/login.ts`, `auth/register.ts`, `site/subscribe-newsletter.ts`, `contact/send-contact-message.ts` no usan `src/lib/rate-limit.ts` (que ya existe y se usa en Wompi). Vector de fuerza bruta, enumeración de emails y spam.
**Fix:** `rateLimit()` por IP/email — login/register 5/5min, newsletter/contact 3/min.

**🟠 S3 — Upload sin validación de MIME real.** `create-update-product.ts` y `update-site-config.ts` limitan tamaño (4MB) pero no validan tipo server-side → spoofing.
**Fix:** whitelist `image/jpeg|png|webp` antes de subir a Cloudinary.

**🟡 S4 — Código muerto de PayPal.** PayPal ya se quitó de la UI, pero quedan `paypal-check-payment.ts`, `set-transaction-id.ts`, `verify-existing-paypal-payment.ts`, el SDK `@paypal/react-paypal-js`, el `PayPalScriptProvider` global y dominios PayPal en CSP. Superficie innecesaria + peso de bundle.
**Fix:** eliminar acciones, componente, provider, dependencia y dominios CSP. (Reduce ataque + mejora INP.)

**🟡 S5 — Race en contador global de cupón.** `place-order.ts` lee `usageCount < usageLimit` y luego incrementa en pasos separados → dos órdenes simultáneas pueden pasar el límite. El uso por-usuario sí está protegido por el unique `couponId_email`.
**Fix:** incremento atómico (`update ... data:{ usageCount: { increment: 1 } }` con check en `where`) o constraint.

**Nota positiva:** `wompi-check-payment` sin `auth()` es **intencional y correcto** (guest checkout): verifica contra la API de Wompi, valida la reference y es idempotente.

### 2. Arquitectura & Performance

- **🟠 A1 — Índices DB faltantes.** Existen en `Order.userId/guestEmail`, `OrderItem`, `ProductVariant`, etc. **Faltan** en `Product.categoryId` (filtro en cada listado), `Order.isPaid/paidAt` (reconciliación, dashboard) y `Order.shippingStatus` (filtros admin). Full-scan con volumen real.
- **🟠 A2 — Cache stale.** PDP con `revalidate = 604800` (7 días) sin invalidación por tag. Si cambia stock/precio, la página sirve datos viejos hasta una semana. **Fix:** `revalidateTag('product-<id>')` en las mutaciones de producto/stock.
- **🟡 A3 — Sin error boundaries.** No hay `error.tsx` global ni en `/admin/*` ni en `/checkout/address`. Un throw rompe la pantalla sin fallback premium. (loading.tsx sí está en varias rutas.)
- **🟡 Imágenes (LCP).** `ProductGridItem` y los slideshow no usan `priority` en above-fold ni `sizes` consistentes. Afecta LCP mobile.
- **🟢 Componentes grandes.** `ProductColorsManager` (429), `ProductVariantsManager` (377), `SearchOverlay` (372), `ProductForm` (354), `NewsletterPopup` (335). No urgente; refactor al tocarlos.
- **🟢 Bundle.** Swiper, react-hook-form y el popup se importan estáticos; candidatos a `next/dynamic`.
- **🟢 `rate-limit.ts` es in-memory.** En Vercel (multi-lambda) no comparte estado → migrar a Upstash Redis cuando haya tráfico real.

### 3. Operación de negocio (ecommerce real)

- **🟠 O1 — Ciclo de vida de órdenes impagas.** El stock se descuenta al **crear** la orden (dentro de la transacción de `place-order`), antes de confirmar pago. `cancel-unpaid-orders.ts` existe pero es **manual** (admin, umbral 24h). Resultado: una orden abandonada **bloquea inventario** indefinidamente hasta que alguien corra la cancelación.
  **Fix:** cron (Vercel Cron) que cancele impagas > X horas y **restaure stock**. Operacionalmente clave para "dueño + asistente".
- **Post-compra:** email de confirmación ✓ (Resend). **Faltan** emails de cambio de estado de envío y de "tu pedido va en camino + tracking".
- **Recuperación de carrito:** no existe captura de carrito ni emails de abandono (oportunidad de revenue).

### 4. Admin / Backoffice

Existe buen CRUD: productos, órdenes (con control de envío, tracking, notas, validación de pago), usuarios (con rol), categorías, colores, newsletter, cupones, config. Dashboard muestra revenue total, revenue del mes + tendencia, conteos y **alerta de stock bajo** (umbral 5).

**🟠 B1 — Falta inteligencia de negocio para operar:**
- Best-sellers / productos en tendencia (no existe).
- AOV, conversión, tendencia diaria/semanal (gráfico).
- Vista de órdenes impagas / abandono.
- Historial de actividad de la orden (cambios de estado visibles).
- CRM básico: cliente recurrente vs nuevo, LTV en la ficha de orden.
- Para "yo + asistente": alertas por email (stock bajo, nueva orden), no solo widgets.

### 5. UX / UI

- **🟡 U1 — Sin debounce.** `SearchOverlay` consulta en cada tecla; `ProductFilters` actualiza URL en cada cambio. Lag en mobile + carga innecesaria al server.
- **🟡 U2 — Carrito sin empty state.** Wishlist y órdenes sí tienen empty state diseñado; el carrito no.
- **Skeletons:** faltan en ficha de producto y listados admin.
- **Mobile-first:** responsive correcto, pero LCP/INP mejorables (imágenes + bundle PayPal muerto).

### 6. Analytics

Embudo GA4 completo ✓ + Vercel Speed Insights ✓. **Faltan eventos secundarios** para optimizar conversión: `view_cart`, `remove_from_cart`, `add_to_wishlist`, `view_item_list`, `select_item`, pasos de checkout (address vs payment) y `user_id` para audiencias.

### 7. Testing (estado: 0)

Cero tests, cero CI, sin Vitest/RTL/Playwright instalados. Único quality gate hoy: `next lint` manual. Riesgo alto de regresión en el flujo de pago al iterar.

---

## Priorización en 4 niveles

### 🔴 Nivel 1 — Crítico antes de abrir pagos reales
1. **S1** — `assertAdmin()` en `createUpdateProduct` + `deleteProductImage` (+ auditar role en todas las admin).
2. **S2** — Rate-limit en login/register/newsletter/contact.
3. **S3** — Whitelist MIME en uploads.
4. **A1** — Migración Prisma: índices `categoryId`, `isPaid`, `paidAt`, `shippingStatus`.
5. **O1** — Vercel Cron: cancelar impagas + restaurar stock.
6. **S4** — Eliminar código muerto de PayPal (seguridad + performance).

### 🟠 Nivel 2 — Importante (primeras semanas de operación)
7. **A2** — `revalidateTag` para producto/stock (evitar PDP stale).
8. **A3** — `error.tsx` global + `/admin` + skeleton de ficha de producto.
9. **S5** — Incremento atómico de `usageCount` de cupón.
10. **B1** — Dashboard de negocio: best-sellers, AOV, tendencia diaria, vista de impagas.
11. **Automatización** — emails de estado de envío + alerta de stock bajo al admin.
12. **U1/U2** — Debounce búsqueda/filtros + empty state de carrito.
13. **Analytics** — eventos secundarios + `user_id`.
14. **LCP** — `priority`/`sizes` en imágenes above-fold.

### 🟡 Nivel 3 — Mejoras futuras (crecimiento/conversión)
- Recuperación de carrito abandonado (captura + email).
- Wishlist sincronizada a BD para usuarias logueadas.
- Reviews/ratings, cross-sell/upsell ampliado.
- CRM/segmentación (recurrente vs nueva, LTV), historial de orden / timeline.
- Inventario: bloqueo auto out-of-stock, import/export, punto de reorden.
- Workflow de devoluciones/RMA + UI de reembolso.

### 🟢 Nivel 4 — Optimizaciones avanzadas
- `next/dynamic` para Swiper, formularios admin y popup.
- Split de componentes >300 líneas.
- Rate-limit → Upstash Redis (multi-instancia).
- NextAuth v5 → estable cuando salga de beta.
- Tightening de CSP de páginas de pago.

---

## Roadmaps

**Técnico:** Nivel 1 seguridad/DB → Nivel 2 cache/errores/cupón → Nivel 4 bundle/refactor incremental.
**Negocio:** automatización (cron + emails) → dashboard de métricas → recuperación de carrito → CRM/loyalty.
**UX:** empty state + debounce + skeletons → LCP/imágenes → eventos analytics para iterar conversión.
**Producción/Operación:** índices DB + cron de impagas + alertas por email → backoffice usable por asistente → logs de actividad.

---

## Quick wins (< 30 min c/u)
- `assertAdmin()` en las 2 actions (el crítico es barato).
- Rate-limit en los 4 endpoints públicos (reusar `rate-limit.ts`).
- Migración de índices Prisma.
- Eliminar PayPal muerto.
- `priority` en primera imagen del grid + `error.tsx` global.
- Debounce 300ms en SearchOverlay.

---

## Estrategia de testing (cobertura seria)

Instalar **Vitest + @testing-library/react + Playwright**. Pirámide pragmática:

- **T1 — Unit dinero-crítico (máxima prioridad):** `currencyFormat`, cálculo de IVA, lógica de totales/stock/cupón de `place-order`, `validateCoupon`, hash de integridad Wompi, verificación de firma del webhook, parsing de `reference`.
- **T2 — Integración (DB de test):** `place-order` happy path (descuento de stock + unicidad de redención de cupón); guards de auth rechazan no-admin (cubre S1 como regresión permanente).
- **T3 — Componentes (RTL):** estados de `WompiButton`, carrito, forms con `useActionState`.
- **T4 — E2E (Playwright):** checkout completo invitado + logueado; login admin + CRUD de producto.
- **CI (GitHub Actions):** type-check + lint + build + Vitest en cada PR; Playwright en `main`/nightly.
- **NO testear:** contenido estático (tabs), presentacionales puros, internals de widgets de terceros.

---

## Riesgos principales
1. **Inventario bloqueado** por órdenes impagas abandonadas (O1) — operacional, alto.
2. **Manipulación de productos/imágenes** sin sesión (S1) — antes de lanzar.
3. **PDP sirviendo stock/precio viejo** hasta 7 días (A2).
4. **Rate-limit inefectivo** entre lambdas de Vercel (in-memory).
5. **NextAuth beta** en producción.
6. **Sin tests** → regresión silenciosa en pago al iterar.

---

## Verificación de hallazgos (reproducible)
- **S1:** `grep -L "auth()" src/actions/product/{create-update-product,delete-product-image}.ts` → no aparecen.
- **A1:** revisar `prisma/schema.prisma` → ausencia de `@@index([categoryId])` en `Product`, `@@index` en `Order.isPaid/paidAt/shippingStatus`.
- **O1:** `place-order.ts` descuenta stock dentro de la tx; `cancel-unpaid-orders.ts` es action manual (sin cron).
- **Analytics OK:** `src/lib/gtag.ts` contiene los 5 eventos del embudo.
- **Cuando se implemente cada fix:** correr `npx tsc --noEmit`, la suite Vitest, y validar el checkout end-to-end en sandbox Wompi.

---

> **Siguiente paso sugerido:** convertir el **Nivel 1** en un plan de implementación ejecutable (es barato y elimina los bloqueadores reales). El resto se ataca por niveles a tu ritmo. No implementar nada hasta tu aprobación.

---

## Mejoras de Devoluciones / RMA (pendientes — implementar después del lanzamiento)

> Base ya implementada: solicitud cliente → estados PENDING/APPROVED/REJECTED/COMPLETED → email automático al cambiar estado. Lo que falta es trazabilidad del ciclo físico de la devolución.

### RMA-1 — Campo de instrucciones al aprobar *(~20 min · MUY URGENTE)*
Cuando el admin aprueba, escribe instrucciones personalizadas que llegan en el email de aprobación:
dirección física de envío, cómo empacar, plazo máximo (ej. 5 días hábiles), qué couriers aceptar.
**Sin esto la clienta no sabe qué hacer después de que le dices "aprobada".**

### RMA-2 — La clienta sube su número de guía *(~45 min)*
Después de la aprobación, la clienta ve un campo en su orden para ingresar el número de guía de Coordinadora/Servientrega.
El admin lo ve en el panel de devoluciones y puede rastrearlo manualmente en la web del courier.
Cierra el loop sin WhatsApp: el admin sabe cuándo esperar el paquete.

### RMA-3 — Estado intermedio "Paquete recibido – en inspección" *(~30 min)*
Agrega estado **RECEIVED** entre APPROVED y COMPLETED.
- Admin recibe el paquete → clic "Paquete recibido" → email a clienta: *"Recibimos tu devolución, estamos verificando (1-2 días hábiles)"*
- Admin inspecciona → si OK → COMPLETED (email: "Todo correcto, enviamos la nueva talla / procesamos reembolso")
- Si no OK → REJECTED con nota explicando por qué (ej. llegó sin etiquetas, usado)
**Protege legalmente al admin: queda registro de cuándo llegó y qué decidiste tras verlo.**

### RMA-4 — Política de días automática *(~30 min)*
Bloquear el botón "Solicitar devolución" si la orden fue entregada hace más de N días (configurable: 15 o 30).
Mostrar mensaje claro: *"El plazo de devolución de 30 días venció el DD/MM/YYYY"*.
Hoy el sistema permite solicitar devolución de una orden de hace 2 años.

### RMA-5 — Upload de foto por la clienta *(~1h)*
Para motivos "Producto defectuoso" o "Llegó dañado": la clienta sube foto antes de que el admin apruebe.
El admin ve la foto en el panel antes de decidir.
Evita fraudes y elimina el intercambio de fotos por WhatsApp.

### RMA-6 — Admin ingresa tracking del nuevo envío *(~20 min)*
Cuando el admin envía la pieza de reemplazo, ingresa el tracking de Coordinadora/Servientrega.
La clienta recibe email con el código y puede rastrearlo. Igual al flujo de la orden original.

### RMA-7 — Integración API de mensajería *(~2-3 semanas · solo cuando el volumen lo justifique)*
Ver sección "Mensajería" más abajo. Implementar solo cuando superes ~20-30 devoluciones/mes.
Hasta entonces el flujo manual (RMA-1 a RMA-6) es suficiente y más barato.

---

## Mensajería / Couriers — análisis para integración futura

### Opciones en Colombia

| Opción | API | Cobertura | Costo integración | Mejor para |
|--------|-----|-----------|-------------------|------------|
| **Envia.com** | ✅ Limpia, REST | Nacional · multi-carrier | Gratis (pagas por envío) | **Recomendada** — agrega Coordinadora + Servientrega + TCC en una sola API |
| **Coordinadora** | ✅ Disponible | Nacional | Requiere cuenta comercial | Directo, buena cobertura rural |
| **Servientrega** | ✅ Disponible | Nacional · más puntos urbanos | Requiere cuenta comercial | Más conocida por clientes |
| **Interrapidísimo** | ⚠️ Limitada | Nacional | Más compleja | No recomendada para e-commerce |

### ¿Cuánto cuesta un envío de devolución?
- **Envío estándar nacional**: $9.000 – $15.000 COP por paquete (hasta 1 kg)
- **Quién paga**: depende de tu política
  - Defecto / error tuyo → KYZZ paga el retorno
  - Cambio de talla / arrepentimiento → la clienta paga (o cobras un fee de $5.000-$8.000)
- **Con API** generas la guía automáticamente y envías el PDF por email a la clienta → ella imprime y va al punto más cercano

### Recomendación: Envia.com
- Una sola cuenta, una sola API → accede a Coordinadora, Servientrega, TCC, etc.
- Compara tarifas en tiempo real entre carriers
- Genera guías programáticamente (POST /shipments → recibe PDF)
- Tiene sandbox para testing
- Documentación: envia.com/developers
- Sin costo mensual fijo, solo pagas por envío (tarifas negociadas, más baratas que retail)

---

## Flujo completo SIN integración de mensajería (solución manual — aplicar desde ya)

Este flujo cubre RMA-1 a RMA-6 sin ninguna API de courier. Es el que debes usar hasta que el volumen justifique la integración.

```
1. Clienta solicita devolución en su orden (motivo + detalles)
      ↓
2. Admin revisa en /admin/devoluciones
   · Si OK → Aprueba con instrucciones (RMA-1):
     "Empaca con etiquetas originales. Envía a: [dirección KYZZ].
      Usa Coordinadora o Servientrega. Plazo: 5 días hábiles.
      Cuando lo envíes, ingresa el número de guía en tu orden."
      ↓
3. Clienta empaca, va a punto de Coordinadora, paga el envío (o KYZZ lo asume)
   Ingresa el número de guía en su orden (RMA-2)
      ↓
4. Admin ve la guía, la rastrea en coordinadora.com.co manualmente
   Cuando llega el paquete → clic "Paquete recibido" (RMA-3 estado RECEIVED)
   Email a clienta: "Recibimos tu devolución, verificando en 1-2 días"
      ↓
5. Admin inspecciona el producto:
   · Etiquetas intactas, sin uso, dentro del plazo → todo OK
   · Ingresa tracking del nuevo envío (RMA-6)
   · Marca COMPLETED → email a clienta con tracking del nuevo producto
      ↓ (si hay problema)
   · Producto llegó sin etiquetas / usado → REJECTED con nota
   · Email a clienta explicando por qué no se puede procesar
      ↓
6. Clienta recibe nuevo producto o reembolso
   El reembolso se hace manual desde Wompi dashboard (hoy no hay reembolso automático)
```

### Lo que hace transparente el proceso para la clienta
- Después de cada acción del admin recibe un email explicando el estado exacto
- Puede ver el estado en tiempo real entrando a "Mis pedidos" → orden → sección devolución
- Sabe exactamente qué debe hacer y cuándo esperar respuesta

### Lo que hace seguro el proceso para el admin
- Todo queda registrado con timestamps en BD (cuándo solicitó, cuándo aprobaste, cuándo llegó, cuándo inspeccionaste)
- Las notas internas son solo para ti (la clienta no las ve)
- El estado RECEIVED antes de COMPLETED te protege: no puedes ser acusada de haber recibido algo que no procesaste
- Para reembolsos: el historial de la devolución es evidencia ante Wompi si hay disputa
