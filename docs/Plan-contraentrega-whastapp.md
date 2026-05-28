# KYZZ — Estrategia de Ventas WhatsApp + Contraentrega + IA

## Context

KYZZ vende moda femenina premium en Colombia. Hoy **toda** venta exige pago online por Wompi; **no existe contraentrega** ni ningún canal de WhatsApp en el código. En Colombia gran parte de las ventas de moda se cierran por WhatsApp y con pago contraentrega/transferencia, así que el sitio actual deja fuera una porción enorme del mercado y, peor aún, las ventas que el equipo cierra hoy por WhatsApp **no descuentan stock ni quedan registradas** → riesgo de sobreventa y cero trazabilidad.

Objetivo: convertir KYZZ en un ecommerce **omnicanal automatizado** donde web, WhatsApp, pagos, contraentrega, inventario y atención queden conectados — construyendo la arquitectura correcta **desde temprano** para escalar sin multiplicar el equipo. Este documento entrega (1) la estrategia completa en 3 niveles y (2) un **plan ejecutable detallado del Nivel 1 (MVP)** sobre el stack actual.

Decisiones tomadas con el dueño:
- **Entrada de pedidos (MVP):** AMBAS vías — checkout web con opción contraentrega + herramienta admin para registrar pedidos de WhatsApp.
- **Stock:** modelo de **stock reservado** (reserva → confirma → vende), separando físico/disponible/reservado. Es la opción robusta y es la base del MVP.
- **Alcance:** estrategia de los 3 niveles + implementación detallada solo del Nivel 1.

---

## Estado actual real (verificado en el código)

**Órdenes** (`prisma/schema.prisma` ~167-207): `Order` tiene `isPaid`, `paidAt`, `cancelledAt`, `shippingStatus` (`pending|processing|shipped|delivered|returned`), `trackingCode`, `shippedAt`, `deliveredAt`, `transactionId`, `paymentGateway` (`paypal|wompi|manual`), cupones. Soporta invitado (`guestEmail`) o `userId`. **No hay campo de canal ni de método de entrega.**

**Stock**: `ProductVariant.stock` (por `productId×colorId×size`) es la fuente de verdad; `Product.inStock` es un agregado derivado. `place-order.ts` valida y **descuenta stock de inmediato dentro de una transacción**. No existe concepto de reservado. El cron `0 2 * * *` (`src/app/api/cron/cancel-orders/route.ts` → `cancel-unpaid-orders.ts`) cancela órdenes `isPaid:false` con >24h y **restaura stock**.

**Pagos**: Wompi completo — `wompi-create-payment.ts` (firma), webhook `src/app/api/wompi/webhook/route.ts` (verifica firma, idempotente), `wompi-check-payment.ts` (al aprobar: `isPaid=true`, `shippingStatus=processing`, envía email). Widget cubre PSE, Nequi, Daviplata, Bancolombia, tarjeta. `mark-order-as-paid.ts` (admin) marca pago `manual`. **Contraentrega = inexistente.**

**Cliente**: `User` (name, email, role admin|user) — **el teléfono NO está en User**, vive en `OrderAddress.phone` / `UserAddress.phone`. Carrito = solo localStorage (Zustand). `AbandonedCart` (email, items JSON, token) existe + `AbandonedCartEmail.tsx`, pero sin disparador automático en el repo.

**Analytics**: 13 eventos GA4 (`src/lib/gtag.ts`). **Sin tablas de métricas en BD**; el dashboard admin (`admin/page.tsx`) calcula todo on-the-fly (ingresos, AOV, tendencia 14 días, best sellers, stock bajo). `get-customer-stats.ts` ya calcula LTV y cliente recurrente.

**WhatsApp**: cero presencia (sin `wa.me`, sin botón). Único contacto: formulario → `hola@kyzz.co`.

**Restricción permanente**: nunca commitear/pushear sin que el dueño lo pida.

---

## Arquitectura objetivo (modelo de datos)

### 1. Stock reservado (núcleo del cambio)
Tres cantidades por variante:
- `stock` = **unidades físicas** en bodega (solo cambia cuando la mercancía sale o se ajusta manualmente).
- `reserved` = unidades comprometidas por órdenes activas (no canceladas, no despachadas).
- `available = stock − reserved` = lo realmente vendible (lo que valida el checkout y muestra la tienda).

Ciclo de vida de stock (unificado para TODOS los canales/métodos):
| Evento | Efecto | Momento |
|--------|--------|---------|
| **Reservar** | `reserved += qty` (valida `available ≥ qty`) | Al crear la orden |
| **Confirmar** (solo COD) | sin cambio de stock; quita expiración de reserva | Equipo valida el pedido |
| **Vender/Comprometer** | `stock -= qty`, `reserved -= qty` | Al despachar (`shippingStatus → shipped`) |
| **Liberar** | `reserved -= qty` (stock intacto) | Cancelación / expiración / rechazo |

`Product.inStock` pasa a significar **disponible** (`Σ(stock − reserved)`) para que la tienda nunca sobreventa.

### 2. Canal y método (omnicanalidad + COD)
- `enum SalesChannel { web whatsapp instagram other }` → `Order.channel @default(web)`.
- `enum PaymentMethod { prepaid cod }` → `Order.paymentMethod @default(prepaid)` (`prepaid` = Wompi online; `cod` = contraentrega).
- `Order.codConfirmedAt DateTime?` (paso anti-fraude: el equipo confirma el COD antes de despachar).
- `Order.reservationExpiresAt DateTime?` (ventana de reserva configurable; `null` = ya confirmado, no expira).
- Extender `PaymentGateway` con `cash` (efectivo recaudado en entrega).
- Índices: `Order.channel`, `Order.paymentMethod`.

### 3. Reglas de avance de estado
- **Prepaid**: igual que hoy — requiere `isPaid` para pasar a `processing/shipped/delivered`.
- **COD**: puede avanzar a `processing/shipped` **sin** `isPaid`; al marcar `delivered` se registra el cobro (`isPaid=true`, `paidAt`, `paymentGateway=cash`).
- **Cron**: el auto-cancelado de 24h aplica **solo a prepaid no pagados**. Los COD **no confirmados** se liberan por su propia `reservationExpiresAt`; los COD confirmados no expiran.

---

## WhatsApp: App vs API (análisis)

| | **WhatsApp Business App** (gratis) | **WhatsApp Business Platform / API** (Meta Cloud API) |
|---|---|---|
| Costo | $0 | Hosting gratis (Cloud API); se paga **por conversación** (tarifa CO). Plantillas de marketing/utilidad con costo |
| Automatización | Respuestas rápidas, mensaje de ausencia, etiquetas, listas difusión (≤256) | Chatbots, webhooks, automatización real, multiagente, plantillas aprobadas |
| Agentes | 1 número, dispositivos vinculados | Bandeja compartida multiagente vía BSP |
| Requisitos | App + número | Verificación Meta Business, número dedicado, aprobación de plantillas |
| Catálogo | Catálogo nativo manual (o feed Meta Commerce) | Igual + envío programático |

**Recomendación**: **Nivel 1 = WhatsApp Business App** (manual) + herramienta interna KYZZ para que las ventas queden en el sistema. **Migrar a Cloud API en Nivel 2**, cuando el volumen justifique chatbot/multiagente. No pagar API antes de tener volumen.

---

## Roadmap por niveles (estrategia)

### NIVEL 1 — MVP económico (stack actual, sin dependencias nuevas)
**Meta**: vender por WhatsApp y contraentrega **con stock sincronizado, trazable y sin sobreventa**, hoy.
- Stock reservado (reserva/confirma/vende/libera).
- Contraentrega en checkout web + página de orden con instrucciones COD.
- Herramienta admin "Nuevo pedido WhatsApp" (registra venta conversacional → reserva stock, `channel=whatsapp`).
- Confirmación COD + avance de estados sin pago previo; cobro al entregar.
- Botón flotante WhatsApp + "Pregunta por esta prenda" en PDP (deep link con producto).
- Canal y método guardados en cada orden + dashboard segmentado web/WhatsApp y prepaid/COD.

**Costo**: bajo (solo desarrollo). **Complejidad**: media-alta (refactor de stock). **Prioridad**: máxima.

### NIVEL 2 — Semi-automatizado (cuando suba el volumen)
- **WhatsApp Cloud API** vía BSP (360dialog/Gupshup/Meta directo) + bandeja multiagente.
- **Chatbot de reglas**: FAQ (envíos, tiempos, métodos de pago), estado de pedido por número, disponibilidad por link.
- **Catálogo Meta** sincronizado por feed (XML/CSV generado desde productos) + deep links a fichas reales (stock siempre exacto).
- **Recuperación de carrito** automática (activar el disparador de `AbandonedCart` ya existente) por email y/o WhatsApp.
- **Recaudo contraentrega con transportadora** (Coordinadora/Servientrega/Interrapidísimo/TCC/Envía) + estados de guía.
- **Tabla de métricas/rollup** para reportes por canal sin recalcular.

**Costo**: medio (API por conversación + BSP). **Complejidad**: media. **Prioridad**: alta tras validar Nivel 1.

### NIVEL 3 — Automatización avanzada + IA
- **Asistente IA (Claude) sobre catálogo real** con function-calling a las APIs de inventario/orden: responde disponibilidad, tallas, arma links de compra, recomienda outfits — **conectado al stock real**, no inventado.
- **Recomendador de tallas** con histórico de devoluciones/compras.
- **IA híbrida humano+bot**: el bot triage y resuelve FAQ 24/7; escala a humano con contexto completo.
- **Dashboards inteligentes**: predicción de demanda, alertas de quiebre, detección de patrones de fraude COD.

**Costo**: medio-alto (tokens IA + dev). **Complejidad**: alta. **Prioridad**: tras Nivel 2 estable. *Realista, sin sobreingeniería: la IA siempre consulta datos reales vía API.*

---

## Flujo de ventas COD + WhatsApp (Nivel 1)

**Cliente (web COD)**: arma carrito → checkout → elige "Pago contraentrega" → recibe confirmación "te contactaremos para confirmar" → equipo confirma por WhatsApp → recibe y paga al mensajero.

**Cliente (WhatsApp)**: escribe por WhatsApp → asesor recomienda/comparte links → cliente acepta → asesor registra el pedido en la herramienta admin → cliente recibe y paga (efectivo/transferencia).

**Sistema (ambos)**: valida `available` → crea orden (`channel`, `paymentMethod=cod`, `reservationExpiresAt`) → **reserva** stock → equipo **confirma** (anti-fraude) → despacha (`shipped`: **vende/comprometе** stock) → entrega (`delivered`: registra cobro). Cancelación/rechazo/expiración → **libera** reserva.

---

## Contraentrega: validación, fraude y logística
- **Confirmación obligatoria** antes de despachar (WhatsApp/llamada) → `codConfirmedAt`. Sin confirmar, la reserva expira y se libera.
- **Anti-fraude**: registrar rechazos/devoluciones por teléfono-dirección; señalar reincidentes; para alto valor o reincidentes, exigir anticipo/transferencia parcial.
- **Logística (Nivel 2)**: transportadora con recaudo contraentrega; conciliar remesas; estados de guía sincronizados con `shippingStatus`/`trackingCode`.

## Catálogo WhatsApp
- **MVP**: compartir **deep links** a fichas reales (stock siempre exacto) + botón "Pregunta por esta prenda".
- **Nivel 2**: feed a **Meta Commerce** para navegación dentro de WhatsApp, pero la **ficha del sitio es la fuente de verdad** del stock.

## Balance Humano + IA
- **IA/bot**: FAQ, disponibilidad, estado de pedido, links, tallas básicas — 24/7.
- **Humano**: asesoría de estilo, recomendaciones, cierre de venta de alto valor/dudosa, quejas, confirmación COD.
- **Escalado a humano** cuando: lo pide explícito, queja/sentimiento negativo, carrito alto valor, el bot falla repetido, postventa.

## Integraciones futuras (priorizadas por costo-beneficio)
| Integración | Nivel | Beneficio | Costo |
|---|---|---|---|
| WhatsApp Cloud API + bandeja | 2 | Automatización real, multiagente | Medio (por conversación) |
| Transportadora con recaudo COD | 2 | Logística + cobro automatizado | Bajo-medio |
| Feed Meta Commerce | 2 | Catálogo en WhatsApp | Bajo |
| Recuperación carrito (activar lo existente) | 2 | Recupera ventas | Muy bajo |
| Asistente IA sobre catálogo | 3 | Atención escalable real | Medio (tokens) |
| Rollup de métricas por canal | 2 | Reportes rápidos | Bajo |

## Métricas desde el día 1 (baratas, alto valor)
Guardar en cada orden (campos, sin tabla nueva): **canal**, **método de pago**, timestamps de confirmación COD, motivo de rechazo/devolución. Calcular on-the-fly (patrón actual de `admin/page.tsx`): ventas por canal, % COD vs prepaid, tasa de confirmación COD, tasa de rechazo en entrega, AOV por canal, productos más vendidos por WhatsApp. (Tiempos de respuesta y tasa de cierre → Nivel 2 con la bandeja API.)

---

## Plan ejecutable — NIVEL 1 (MVP)

> Una sola migración Prisma + refactor de stock + dos vías de pedido + quick wins de WhatsApp. Sin dependencias nuevas.

### Paso 1 — Schema (`prisma/schema.prisma`) + 1 migración
- `enum SalesChannel { web whatsapp instagram other }`, `enum PaymentMethod { prepaid cod }`.
- `Order`: `channel SalesChannel @default(web)`, `paymentMethod PaymentMethod @default(prepaid)`, `codConfirmedAt DateTime?`, `reservationExpiresAt DateTime?`; índices `channel`, `paymentMethod`.
- `ProductVariant`: `reserved Int @default(0)`.
- `PaymentGateway`: agregar `cash`.
- **Backfill** (en la migración o script): para órdenes activas (no canceladas, no `shipped/delivered`) cuyo stock ya fue descontado bajo el modelo viejo, sumar su `qty` de vuelta a `stock` y a `reserved` (así `available` no cambia y el invariante `stock=físico` queda correcto). Órdenes ya despachadas: `reserved=0` (stock ya salió). **Verificar con conteo antes/después.**

### Paso 2 — Utilidades de stock (nuevo: `src/actions/stock/stock-ops.ts`)
`reserveStock(tx, items)`, `commitStock(tx, items)` (`stock-=qty; reserved-=qty`), `releaseStock(tx, items)` (`reserved-=qty`), y `syncProductInStock(tx, productIds)` (recalcula `inStock = Σ(stock−reserved)`). Centraliza la lógica para que las 3 vías la reusen.

### Paso 3 — Refactor del flujo de orden
- `place-order.ts`: validar contra `available` y **reservar** (no descontar). Aceptar `channel` y `paymentMethod`; si `cod` → `reservationExpiresAt = now + N h` (config), `shippingStatus=pending`, sin Wompi.
- `cancel-unpaid-orders.ts`: filtrar a **prepaid no pagados** y **liberar** reserva. Añadir barrido que libere **COD no confirmados** vencidos por `reservationExpiresAt`. Reusar `releaseStock`.
- `update-order-shipping.ts`: en `shipped` → `commitStock`. Relajar la regla `isPaid` solo para `paymentMethod=cod`; en `delivered` COD → `isPaid=true`, `paidAt`, `paymentGateway=cash`. **Prepaid intacto.**
- `wompi-check-payment.ts`: sin cambio de stock (sigue reservado hasta `shipped`); mantener `isPaid` + `processing` + email.

### Paso 4 — Contraentrega en web
- Checkout (`src/app/(shop)/checkout/...`, `PlaceOrder.tsx`): selector **Wompi (prepago)** vs **Contraentrega**; pasar `paymentMethod`/`channel='web'` a `placeOrder`.
- `/orders/[id]`: si `cod`, mostrar instrucciones ("te contactaremos para confirmar") en vez del botón Wompi.

### Paso 5 — Herramienta admin "Nuevo pedido WhatsApp"
- Página `src/app/(shop)/admin/orders/nuevo/page.tsx` (+ UI cliente): buscar/crear cliente (nombre, **teléfono**, email), buscar productos y elegir **variante (color/talla) con `available` en vivo**, dirección, `channel='whatsapp'`, `paymentMethod` (cod|prepaid), opción "marcar pagado" (transferencia).
- Acción `src/actions/order/create-manual-order.ts` (admin-only): reusa `reserveStock` + crea orden. Reusar `resolveVariant` y `searchProductsQuick`.

### Paso 6 — Confirmación COD + estado
- En `ShippingPanel.tsx`: botón "Confirmar pedido COD" → `codConfirmedAt=now`, `reservationExpiresAt=null`. Acción nueva o extender `update-order-shipping.ts`.

### Paso 7 — Quick wins WhatsApp
- Botón flotante `wa.me` site-wide + link en footer. Env `NEXT_PUBLIC_WHATSAPP_NUMBER`.
- PDP: "Pregunta por esta prenda" con mensaje pre-llenado (nombre + URL del producto).

### Paso 8 — Métricas por canal
- Extender `admin/page.tsx` con desglose web/WhatsApp y COD/prepaid + tasa de confirmación/rechazo COD, reusando el patrón de agregación on-the-fly.

### Archivos clave
`prisma/schema.prisma` (+migración) · **nuevo** `src/actions/stock/stock-ops.ts` · `src/actions/order/place-order.ts` · `cancel-unpaid-orders.ts` · `update-order-shipping.ts` · **nuevo** `create-manual-order.ts` · `src/actions/payments/wompi-check-payment.ts` · checkout `PlaceOrder.tsx` · `src/app/(shop)/orders/[id]/...` · **nuevo** `src/app/(shop)/admin/orders/nuevo/` · `admin/orders/[id]/ui/ShippingPanel.tsx` · `admin/page.tsx` · botón WhatsApp en layout/footer + PDP · `.env.example`.

---

## Riesgos
- **Refactor del path de stock probado (Wompi)** → regresión. Mitigar: utilidades centralizadas + backfill verificado + pruebas de regresión del flujo prepaid completo.
- **Backfill incorrecto** → desajuste de inventario. Verificar conteos antes/después; correr en mantenimiento.
- **Relajar `isPaid` para COD** no debe filtrarse a prepaid. Cubrir con pruebas ambos métodos.
- **Fraude COD** (operacional): confirmación previa + registro de rechazos.
- **Doble vía (web+WhatsApp)** amplía superficie de prueba.

## Verificación (cerrar antes de avanzar)
1. `npx prisma migrate dev` + `npx tsc --noEmit` limpios; backfill validado con conteos de stock antes/después.
2. **Regresión prepaid**: checkout Wompi → pago → `processing` → `shipped` (commit) → `delivered`. Stock correcto en cada paso.
3. **Web COD**: checkout contraentrega → reserva → confirmar → shipped (commit) → delivered (cobro). Cancelar/expirar → libera.
4. **Admin WhatsApp**: crear pedido → `channel=whatsapp`, reserva correcta, `available` no permite sobreventa.
5. **Cron**: prepaid >24h se cancela y libera; COD confirmado NO se cancela; COD no confirmado vencido se libera.
6. Dashboard muestra desglose por canal y método. Botones WhatsApp abren chat con mensaje correcto.

## Quick wins inmediatos (bajo esfuerzo, alto impacto)
- Botón flotante WhatsApp + "Pregunta por esta prenda" en PDP (días, no semanas).
- Guardar `channel`/`paymentMethod` desde el primer día (habilita toda la analítica futura).
- Activar el `AbandonedCartEmail` ya existente (recuperación de ventas casi gratis).
