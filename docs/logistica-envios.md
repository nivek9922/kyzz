# KYZZ — Capa Logística y Automatización de Envíos (Colombia)

> Documento estratégico y arquitectónico. Hoja de ruta para profesionalizar y automatizar la logística de KYZZ sin romper la arquitectura actual.
>
> **Estado:** diseño aprobado · implementación por fases pendiente.
> **Última actualización:** 2026-05-28.
>
> **Aclaración sobre costos:** las tarifas colombianas de transporte cambian seguido y dependen de volumen negociado, peso, destino y temporada. Todas las cifras aquí son **rangos aproximados de referencia** — confirmar con cotización real antes de decidir. No tomar como precio cerrado.

---

## 1. Resumen ejecutivo + recomendación final

**Veredicto en 5 líneas:**

1. Empezar con un **agregador colombiano hecho para ecommerce: Heka o Mipaquete**. Una sola integración da acceso a Interrapidísimo, Servientrega, Coordinadora y TCC, con **recaudo contraentrega (COD) incluido** y **sin costo fijo mensual**.
2. Construir la capa con un **patrón adapter agnóstico de proveedor** (`ShippingProvider`) para no quedar atados a una sola plataforma y poder cambiar o sumar transportadoras sin reescribir.
3. **Fase 1 = manual-estructurada**: modelar `Shipment`/`TrackingEvent`/`Carrier`, agregar `departamento` a la dirección, persistir `shippingCost`, y un quick-win enorme: **link de tracking clickeable por transportadora** (sin API). La guía se sigue creando a mano, pero queda trazable y enlazada.
4. **Fase 2 = automatización real** con la API del agregador: guía automática al pagar/confirmar COD, label PDF descargable, y webhooks que actualizan el estado y disparan WhatsApp/email solos.
5. **No sobre-ingeniería**: el motor de stock, el gate de pago/COD y la infraestructura de WhatsApp/email **ya existen** — la capa logística se engancha encima, no reemplaza nada.

**Por qué Heka/Mipaquete y no integrar una transportadora directa primero:** una marca pequeña no tiene volumen para negociar contrato directo con Coordinadora/Servientrega, y construir 3 integraciones distintas es desperdicio. El agregador te da multi-transportadora + recaudo COD el día uno, pagas solo por guía despachada, y migras a contratos directos cuando el volumen lo justifique (Fase 3+).

---

## 2. Análisis comparativo honesto de plataformas

> Sin marketing. Ventajas, problemas y costos reales.

### 2.1 Agregadores para ecommerce (multi-transportadora + recaudo COD + API)

| Plataforma | Ventajas reales | Problemas reales | Costo (aprox.) | API | COD/Recaudo | Escala | Uso fashion CO |
|---|---|---|---|---|---|---|---|
| **Heka** | Hecho para ecommerce CO. Multi-transportadora (Interrapidísimo, Servientrega, Coordinadora, TCC, Envía, Domina). Recaudo COD fuerte. Sin costo fijo. Dashboard simple. | Margen sobre la guía (no es la tarifa más baja posible). Dependes de su disponibilidad. Documentación de API mejorable. | $0 fijo + margen por guía | REST, webhooks | ★★★★★ (su fuerte) | ★★★★ | Muy usado por IG/Shopify sellers |
| **Mipaquete** | Igual filosofía que Heka, muy popular. Multi-transportadora + recaudo. API decente. Sin costo fijo. | Mismo margen sobre guía. Soporte variable. | $0 fijo + margen por guía | REST, webhooks | ★★★★★ | ★★★★ | Muy usado |
| **Envia.com** | API/webhooks más limpios y documentados. Multi-país LatAm. Bueno para escalar. | Recaudo COD en Colombia menos fluido que Heka/Mipaquete. Orientado más a prepago. | $0 fijo + por guía | REST, webhooks ★★★★★ | ★★★ | ★★★★★ | Medio |
| **SkydropX** | Buena API, origen MX, creciendo. | COD en Colombia débil; fuerte en México. Cobertura CO menor. | Por guía | REST ★★★★ | ★★ | ★★★ | Bajo en CO |

### 2.2 Transportadoras directas (transportadoras nacionales)

| Plataforma | Ventajas reales | Problemas reales | Costo (aprox.) | API | COD | Escala | Uso fashion CO |
|---|---|---|---|---|---|---|---|
| **Interrapidísimo** | **El COD más barato** y mayor cobertura en pueblos/municipios pequeños. Red enorme. | API directa engorrosa; la mayoría lo usa vía agregador. Onboarding lento. | El más económico para COD | Limitada/engorrosa | ★★★★★ | ★★★★ | Altísimo (estándar COD) |
| **Servientrega** | Ubicua, confiable, COD fuerte, puntos físicos en todo el país. | API enterprise/clunky, onboarding con contrato. | Medio | Existe (clunky) | ★★★★ | ★★★★★ | Alto |
| **Coordinadora** | Premium nacional, buena para producto valioso/pesado. Confiable. | Requiere contrato/volumen. API enterprise. Más cara. | Medio-alto | Enterprise | ★★★ | ★★★★★ | Medio (premium) |
| **TCC** | Sólida, B2B-friendly, nacional. | Menos orientada a ecommerce B2C pequeño. | Medio | Enterprise | ★★★ | ★★★★ | Medio |

### 2.3 Última milla urbana (same-day / next-day)

| Plataforma | Ventajas reales | Problemas reales | Costo | API | Uso |
|---|---|---|---|---|---|
| **Mensajeros Urbanos** | Same-day en Bogotá/Medellín/Cali. API. Soporta COD. Experiencia premium urbana. | Solo grandes ciudades. Más caro que nacional. | Alto (urbano) | REST ★★★★ | Premium urbano |
| **99minutos** | Same/next-day urbano LatAm. Buena API/tracking. Creciendo en CO. | Cobertura urbana limitada. Precio premium. | Alto (urbano) | REST ★★★★★ | Premium urbano (Fase 4) |

### 2.4 Fulfillment / 3PL (bodega + pick/pack/ship)

| Plataforma | Ventajas reales | Problemas reales | Costo | Cuándo |
|---|---|---|---|---|
| **Melonn** | 3PL colombiano: almacena inventario, hace picking/packing/envío. Integraciones + API. Quita casi toda la operación. | Fee de almacenamiento + pick&pack (mayor costo por unidad). Pierdes control directo del inventario físico. Requiere volumen para que valga. | Almacenaje + pick&pack + envío | **Fase 4** (cuando la operación in-house sea cuello de botella) |

---

## 3. TOPs recomendados

| Categoría | Ganador | Por qué |
|---|---|---|
| **TOP MVP (arrancar rápido)** | **Heka / Mipaquete** | Multi-transportadora + recaudo COD con una sola integración. Sin costo fijo. Cubre el modelo COD+WhatsApp colombiano desde el día uno. |
| **TOP Escalabilidad** | **Envia.com** o **contratos directos** (Servientrega/Coordinadora) | API limpia multi-país (Envia) o mejores tarifas negociadas al tener volumen (directo). |
| **TOP Automatización** | **Heka / Mipaquete** | API REST + webhooks → guía automática y tracking sin intervención. |
| **TOP Costo-beneficio marca pequeña** | **Heka / Mipaquete** | $0 fijo, pagas solo por guía despachada, recaudo COD incluido. Cero riesgo de costo hundido. |
| **TOP Experiencia premium urbana** | **99minutos / Mensajeros Urbanos** | Same-day en grandes ciudades — diferenciador de marca (Fase 4). |
| **TOP Operación sin manos** | **Melonn** | Outsourcing total del fulfillment (Fase 4). |

---

## 4. Flujo operacional moderno completo

Cómo funciona un ecommerce profesional de punta a punta, y cómo se modela en KYZZ (reutilizando lo que ya existe).

```
1.  Cliente entra            → catálogo (ya existe)
2.  Compra producto          → carrito (ya existe)
3.  Paga / elige COD         → checkout + Wompi / selector COD (ya existe)
4.  Orden creada             → Order (ya existe)
5.  Stock reservado          → reserveStock() en stock-ops.ts (ya existe)
6.  Generación de guía        → [NUEVO] Shipment + provider.createShipment()
7.  Recolección               → [NUEVO] pickup (programada o en punto)
8.  Despacho                  → updateOrderShipping('shipped') + commitStock() (ya existe) + label
9.  Tracking                  → [NUEVO] TrackingEvent vía webhook del agregador
10. Entrega                   → updateOrderShipping('delivered') (ya existe); si COD → isPaid=true (ya existe)
11. Devolución                → ReturnRequest (ya existe) + [NUEVO] guía de retorno
12. Reembolso                 → ReturnRequest.refundAmount/refundMethod (ya existe)
13. Cancelación               → cancelUnpaidOrders + releaseStock() (ya existe)
14. Contraentrega             → COD anti-fraude (ya existe) + [NUEVO] recaudo conciliado
```

**Lectura clave:** de 14 pasos, **9 ya están resueltos**. La capa logística nueva cubre los pasos 6, 7, 9 y el recaudo del 14, más la guía de retorno del 11. Todo lo demás se reutiliza.

### Cómo modelar cada paso nuevo

- **Paso 6 (guía):** al confirmarse el pago (webhook Wompi) o al confirmar un COD (`confirmCodOrder`), se crea un `Shipment` y — en Fase 2 — se llama `provider.createShipment()` para obtener número de guía + label. En Fase 1 el admin pega la guía manualmente.
- **Paso 9 (tracking):** el agregador envía webhooks de cada movimiento → se persiste como `TrackingEvent` → se mapea a `Order.shippingStatus` → se notifica al cliente.
- **Paso 8 (despacho):** se mantiene `updateOrderShipping('shipped')` que ya hace `commitStock()` y envía el email de despacho; se le suma adjuntar el label.

---

## 5. Contraentrega (sección crítica para Colombia)

El COD es el corazón del ecommerce colombiano y la mayor fuente de fraude/pérdida. KYZZ **ya tiene la base anti-fraude** — hay que reutilizarla y sumarle el recaudo.

### Lo que YA existe (reutilizar)
- `Order.paymentMethod = 'cod'` y gate en `updateOrderShipping`: un COD avanza sin estar pagado (se cobra al entregar).
- `Order.codConfirmedAt`: el equipo confirma el pedido (validación humana/WhatsApp) antes de despachar.
- `Order.reservationExpiresAt` + cron `cancelUnpaidOrders`: si un COD no se confirma a tiempo, libera el stock reservado.
- Al marcar `delivered` un COD → `isPaid=true, paymentGateway='cash'` (cobro registrado).

### Lo que falta (capa nueva)
1. **Validación de pedido antes de guía** — confirmar dirección y disponibilidad real del cliente por WhatsApp antes de generar la guía (reduce rechazos en entrega).
2. **Manejo de órdenes rechazadas en entrega** — un nuevo estado/evento "novedad" o "rechazado en entrega" que dispare: devolución del producto a bodega (`restoreStock()`), notificación al equipo, y registro del costo de flete perdido.
3. **Recaudo (cómo vuelve el dinero)** — el agregador cobra el efectivo al cliente y te lo consigna (menos su comisión) en ciclos (semanal/quincenal). Hay que **conciliar** lo recaudado contra las órdenes COD entregadas: campo `Shipment.codCollected` + `codAmount` y un reporte de conciliación.
4. **Automatización de confirmaciones** — usar la infra WhatsApp existente para pedir confirmación del COD ("Confirma tu pedido respondiendo SÍ") antes de despachar.

### Anti-fraude COD — capas de defensa
- Confirmación obligatoria (`codConfirmedAt`) antes de despachar.
- Expiración de reserva si no se confirma (cron actual).
- WhatsApp de confirmación con respuesta del cliente.
- Histórico de rechazos por cliente/teléfono (futuro): marcar clientes con alta tasa de rechazo COD.
- Límite de monto COD para clientes nuevos (futuro, regla de negocio).

---

## 6. Arquitectura técnica recomendada

> Cómo encaja **sin romper nada**.

### 6.1 Patrón adapter — `ShippingProvider`

La pieza central. KYZZ nunca habla directo con una transportadora; habla con una **interfaz**. Cada proveedor implementa esa interfaz. Cambiar Heka↔Mipaquete↔directo = cambiar el adaptador, no el resto del sistema.

```typescript
// src/lib/shipping/provider.ts  (Fase 2)
export interface ShippingRate {
  carrier: Carrier;
  service: string;          // "estándar" | "express" | ...
  cost: number;             // COP
  estimatedDays: number;
  codFee?: number;          // comisión de recaudo si aplica
}

export interface CreateShipmentInput {
  orderId: string;
  toAddress: ShippingAddress;   // incluye departamento + ciudad (DANE)
  items: { description: string; quantity: number; weightGr: number }[];
  declaredValue: number;
  cod?: { amount: number };      // si es contraentrega
}

export interface CreatedShipment {
  providerRef: string;          // número de guía
  trackingCode: string;
  labelUrl: string;             // PDF de la guía
  cost: number;
  estimatedDelivery?: Date;
}

export interface ShippingProvider {
  quoteRates(input: CreateShipmentInput): Promise<ShippingRate[]>;
  createShipment(input: CreateShipmentInput): Promise<CreatedShipment>;
  getLabel(providerRef: string): Promise<string>;        // URL/base64 PDF
  getTracking(providerRef: string): Promise<TrackingSnapshot>;
  cancelShipment(providerRef: string): Promise<void>;
  parseWebhook(payload: unknown): NormalizedTrackingEvent | null;
}
```

Adaptadores: `HekaAdapter`, `MipaqueteAdapter`, `ManualAdapter` (Fase 1, sin API: solo guarda lo que el admin pega).

### 6.2 Nuevos modelos Prisma (se implementan en Fase 1)

```prisma
enum Carrier {
  heka
  mipaquete
  interrapidisimo
  servientrega
  coordinadora
  tcc
  mensajeros_urbanos
  noventa_y_nueve   // 99minutos
  manual
}

enum ShipmentStatus {
  created           // guía generada
  picked_up         // recogida por la transportadora
  in_transit
  out_for_delivery
  delivered
  failed_attempt    // novedad / intento fallido
  returned          // devuelta a origen
  cancelled
}

model Shipment {
  id                String          @id @default(uuid())
  order             Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderId           String          @unique
  carrier           Carrier
  providerRef       String?         // número de guía de la transportadora
  trackingCode      String?
  labelUrl          String?         // PDF de la guía
  status            ShipmentStatus  @default(created)
  cost              Float?          // costo del flete (COP)
  codAmount         Float?          // monto a recaudar (si COD)
  codCollected      Boolean         @default(false)
  codSettledAt      DateTime?       // cuándo el agregador consignó el recaudo
  estimatedDelivery DateTime?
  pickupAt          DateTime?
  rawPayload        Json?           // respuesta cruda del proveedor (auditoría)
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  trackingEvents    TrackingEvent[]

  @@index([carrier])
  @@index([status])
  @@index([providerRef])
}

model TrackingEvent {
  id          String         @id @default(uuid())
  shipment    Shipment       @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  shipmentId  String
  status      ShipmentStatus
  description String
  location    String?
  occurredAt  DateTime
  raw         Json?
  createdAt   DateTime       @default(now())

  @@index([shipmentId])
  @@index([occurredAt])
}
```

### 6.3 Extensiones a modelos existentes

- **`OrderAddress` + `state` (departamento)** y opcional **`cityCode` (código DANE)**. Toda transportadora colombiana exige departamento + ciudad normalizada; hoy `OrderAddress` solo tiene `city` y `postalCode`. **Sin esto no se puede generar ninguna guía.**
- **`Order` + `shippingCost: Float`** para persistir el costo real del envío. Hoy el envío es solo una constante en `src/config/constants.ts` (`SHIPPING_COST`, `FREE_SHIPPING_THRESHOLD`) y no se guarda por orden.

### 6.4 Mapeo con lo actual (cero ruptura)

- **`Order.shippingStatus`** sigue siendo el **estado canónico cara-al-cliente** (los 5 estados actuales: pending/processing/shipped/delivered/returned). Se **deriva** de `Shipment.status` mediante una función de mapeo (`ShipmentStatus → ShippingStatus`). La UI, los emails y WhatsApp actuales **no cambian**.
- **`Order.trackingCode`** queda denormalizado desde `Shipment.trackingCode` por compatibilidad — lo que ya muestra la página del cliente y el email sigue funcionando.
- **El commit de stock sigue en `updateOrderShipping`** — no se mueve la lógica de inventario.

---

## 7. Integración con el admin KYZZ

> Centralizar la operación en el admin propio, **sin depender de dashboards externos**.

En el detalle del pedido (`/admin/orders/[id]`), junto al `ShippingPanel` actual:

- **Crear guía** — botón que (Fase 1) abre formulario para elegir transportadora + pegar número de guía; (Fase 2) llama `provider.createShipment()` y genera la guía sola.
- **Descargar / imprimir label** — botón que abre el PDF (`Shipment.labelUrl`).
- **Ver tracking** — timeline de `TrackingEvent` (reutiliza el patrón visual de `OrderTimeline.tsx`).
- **Ver costo y tiempo estimado** — `Shipment.cost`, `estimatedDelivery`.
- **Gestión de recaudo COD** — estado `codCollected` / `codSettledAt` + reporte de conciliación.
- **Devoluciones / logística inversa** — generar guía de retorno desde el `ReturnRequest` (Fase 3+).

**Nueva entrada de nav** "Logística" o "Envíos" en `src/app/(shop)/admin/layout.tsx` (NAV) para una vista agregada: envíos en tránsito, con novedad, entregados, recaudo pendiente.

**Convenciones visuales a respetar** (ya usadas en el admin): contenedor `kyzz-panel`, inputs `kyzz-input`, botones `btn-primary`, labels `text-[10px] tracking-widest uppercase text-kyzz-muted`, badges de estado con paleta emerald/blue/amber/red. La UI logística debe sentirse KYZZ — minimalista y premium, no dashboard técnico.

---

## 8. Automatizaciones priorizadas

| Automatización | Cómo | Reutiliza | Fase |
|---|---|---|---|
| **Guía automática al pagar** | Webhook Wompi confirma pago → crea `Shipment` + `provider.createShipment()` | webhook Wompi existente | 2 |
| **Guía automática al confirmar COD** | `confirmCodOrder` → crea `Shipment` | `confirmCodOrder` existente | 2 |
| **Tracking en vivo** | Webhook del agregador → `TrackingEvent` → mapea a `shippingStatus` | — | 2 |
| **WhatsApp/email automáticos por estado** | Cada cambio de estado dispara plantilla | `whatsapp-api.ts`, `OrderShippedEmail` | 2 |
| **Alertas de envíos estancados** | Cron detecta envíos sin movimiento N días → avisa al equipo | cron existente | 3 |
| **Cancelación de stock reservado** | COD no confirmado expira → `releaseStock()` | **ya existe** | ✅ |
| **Devolución con label de retorno** | `ReturnRequest` aprobada → genera guía inversa | `ReturnRequest` existente | 3-4 |

---

## 9. Costos (rangos aproximados — confirmar con cotización)

| Concepto | Heka/Mipaquete (agregador) | Directo (con volumen) | Notas |
|---|---|---|---|
| **Costo fijo mensual** | $0 | Variable / contrato | El agregador no cobra mensualidad. |
| **Por guía nacional (1kg, ciudad principal)** | ~$8.000–$15.000 COP | Más barato con volumen | Depende de peso y destino. |
| **Recaudo COD** | ~2.5%–5% del valor recaudado o tarifa fija ~$2.000–$4.000 | Negociable | Comisión por manejar el efectivo. |
| **Recolección (pickup)** | Gratis con volumen o ~$2.000–$5.000 | Gratis con contrato | A veces incluida. |
| **Devolución / flete de retorno** | ~50%–100% de una guía | Variable | Costo de logística inversa. |
| **API** | Incluida | Variable | El agregador no cobra por API. |
| **Costos ocultos** | Sobrecostos por peso volumétrico, reexpediciones, zonas especiales/rurales, seguro de mercancía | Iguales | Pesar bien y declarar valor correcto. |

**Rentabilidad:**
- **Tienda pequeña:** agregador gana — $0 fijo, sin riesgo. Cada guía es costo variable directo sobre una venta real.
- **Al crecer:** evaluar contratos directos (Servientrega/Coordinadora) para bajar el costo por guía, manteniendo el agregador como fallback vía adapter.

---

## 10. Roadmap por fases

### Fase 1 — MVP inteligente
**Objetivo:** estructura y trazabilidad sin depender aún de ninguna API externa.
- **Entregables:** modelos `Shipment`, `TrackingEvent`, enums `Carrier`/`ShipmentStatus`; `OrderAddress.state` (departamento); `Order.shippingCost`; **quick-win: link de tracking clickeable por transportadora** (mapa `Carrier → URL` de rastreo); selección de transportadora + guía estructurada en admin; timeline de tracking para el cliente.
- **Prioridad:** Alta · **Complejidad:** Baja-Media · **Costo:** $0 (solo desarrollo).
- **Archivos:** `prisma/schema.prisma`, migración; `src/lib/shipping/carriers.ts` (mapa de URLs); `ShippingPanel.tsx`, `OrderTimeline.tsx`, página de orden del cliente; checkout (capturar departamento).

### Fase 2 — Automatización operacional
**Objetivo:** reducir trabajo manual con la API del agregador.
- **Entregables:** `ShippingProvider` + `HekaAdapter`/`MipaqueteAdapter`; guía automática al pagar/confirmar COD; descarga de label PDF; webhook de tracking → estado + notificación WhatsApp/email automática; inicio de recaudo COD (`codCollected`).
- **Prioridad:** Alta · **Complejidad:** Media · **Costo:** por guía (sin fijo).
- **Archivos:** `src/lib/shipping/*`, `src/app/api/shipping/webhook/route.ts`, hooks en webhook Wompi y `confirmCodOrder`, `whatsapp-api.ts`.

### Fase 3 — Operación escalable
**Objetivo:** preparar alto volumen.
- **Entregables:** rate-shopping real en checkout (tarifa por departamento/peso); ≥2 proveedores vía adapter; recolecciones/manifiestos; manejo de intentos de entrega/novedades; dashboard logístico (en tránsito / novedades / devoluciones); alertas SLA; recaudo COD conciliado.
- **Prioridad:** Media · **Complejidad:** Media-Alta · **Costo:** por guía + tiempo de desarrollo.

### Fase 4 — Fulfillment avanzado
**Objetivo:** operación casi sin manos.
- **Entregables:** 3PL (Melonn) o multi-bodega; logística inversa automatizada; same-day urbano (99minutos/Mensajeros Urbanos); reglas de ruteo automático por destino/costo.
- **Prioridad:** Baja (futuro) · **Complejidad:** Alta · **Costo:** alto (fees 3PL).

---

## 11. Riesgos futuros

- **Lock-in de proveedor** → mitigado por el patrón adapter; ningún proveedor se hard-codea.
- **Calidad de datos de dirección** → sin `departamento`/ciudad DANE normalizada, las guías fallan o se reexpiden (costo). Validar en checkout.
- **Conciliación de recaudo COD** → el dinero llega en ciclos; sin conciliación se pierde plata. Modelar `codCollected`/`codSettledAt` desde temprano.
- **Novedades de entrega** → rechazos, direcciones erradas, cliente ausente. Necesitan un flujo explícito (devolución a bodega + `restoreStock()`).
- **Dependencia de webhooks** → si el agregador no notifica, el estado se desactualiza. Tener un cron de respaldo que haga *polling* de tracking.

---

## 12. Quick wins (máximo valor, mínimo esfuerzo)

1. **Link de tracking por transportadora** — convertir el `trackingCode` plano en un enlace clickeable según `Carrier` (mapa `Carrier → URL`). Cero API, gran mejora de UX. *(Fase 1)*
2. **`departamento` en la dirección** — desbloquea cualquier integración futura y mejora la calidad de datos ya. *(Fase 1)*
3. **Persistir `shippingCost` por orden** — habilita reportes de margen real y rate-shopping futuro. *(Fase 1)*
4. **WhatsApp automático al despachar** — reutiliza `whatsapp-api.ts` (ya existe) para avisar "tu pedido va en camino" con el link de tracking. *(Fase 1-2)*

---

## 13. Recomendaciones estratégicas

- **Empezar simple y agnóstico.** Fase 1 sin API: estructura + links. No te ates a un proveedor antes de tener volumen.
- **No depender de dashboards externos.** Centraliza la operación en el admin KYZZ; el agregador es un proveedor, no tu sistema operativo.
- **Medir antes de automatizar.** Con datos de costo por guía y tasa de rechazo COD decides qué transportadora y qué reglas.
- **Dejar el adapter listo desde Fase 2** para no reescribir cuando sumes Envia.com, contratos directos o 99minutos.
- **Reutilizar, no reconstruir.** El stock, el gate de pago/COD, WhatsApp/email y el cron ya resuelven la mitad — engánchate.

---

## 14. Apéndice — Integración con el código actual

> Archivo por archivo: qué se reutiliza y qué se extiende. **Sin romper arquitectura.**

| Archivo actual | Rol hoy | Qué se hace en la capa logística |
|---|---|---|
| `prisma/schema.prisma` | Modelos `Order`, `OrderAddress`, `OrderItem`, `ProductVariant`, `ReturnRequest`, enums | **Extender:** añadir `Shipment`, `TrackingEvent`, enums `Carrier`/`ShipmentStatus`; `OrderAddress.state` (+ `cityCode`); `Order.shippingCost`. No se modifica nada existente, solo se agrega. |
| `src/lib/stock-ops.ts` | `reserveStock`, `commitStock`, `restoreStock`, `releaseStock`, `syncProductInStock` | **Reutilizar tal cual.** `commitStock` ya corre al despachar; `restoreStock` ya sirve para devoluciones/novedades; `releaseStock` para cancelaciones. |
| `src/actions/order/update-order-shipping.ts` | `updateOrderShipping` (transiciones + commit + email), `confirmCodOrder` | **Reutilizar + enganchar.** El cambio a `shipped` sigue igual; se le suma crear/adjuntar el `Shipment` y su label. `confirmCodOrder` dispara la guía en Fase 2. |
| Webhook Wompi (`src/app/api/wompi/...`, `wompi-check-payment.ts`) | Confirma pago, marca `isPaid`, envía email de confirmación | **Enganchar:** al confirmar pago prepago, crear `Shipment` (Fase 2). |
| `src/app/(shop)/admin/orders/[id]/ui/ShippingPanel.tsx` | Estado de envío, tracking code, notas, marcar pagado, confirmar COD | **Extender:** sección "Guía/Transportadora" (elegir carrier, guía, label, costo). |
| `src/app/(shop)/admin/orders/[id]/ui/OrderTimeline.tsx` | Timeline de la orden (creado/pago/enviado/entregado) | **Reutilizar patrón** para renderizar el timeline de `TrackingEvent`. |
| `src/app/(shop)/orders/[id]/page.tsx` | Barra de progreso + `trackingCode` en texto plano | **Extender:** `trackingCode` → link por transportadora; timeline de tracking en vivo. |
| `src/lib/whatsapp-api.ts` | `sendText`, `sendTemplate`, `markAsRead` | **Reutilizar** para notificaciones automáticas de envío/tracking. |
| `src/emails/OrderShippedEmail.tsx` | Email "en camino" con tracking code | **Extender:** tracking code como link; estados de tracking. |
| `src/config/constants.ts` | `SHIPPING_COST`, `FREE_SHIPPING_THRESHOLD` | **Mantener** como fallback; el costo real pasa a `Order.shippingCost` / `Shipment.cost`. |
| `src/app/(shop)/admin/layout.tsx` | NAV del admin | **Extender:** nueva entrada "Logística/Envíos". |
| `vercel.json` + `src/actions/order/cancel-unpaid-orders.ts` | Cron diario (cancela impagos, libera stock, carrito abandonado) | **Reutilizar + sumar:** cron de respaldo para *polling* de tracking y alertas de envíos estancados (Fase 3). |

### Principio rector del apéndice
La capa logística es **aditiva**: nuevos modelos y archivos en `src/lib/shipping/` que se *enganchan* a los puntos de extensión ya existentes (webhook de pago, `confirmCodOrder`, `updateOrderShipping`). El estado cara-al-cliente (`Order.shippingStatus`) permanece como la única fuente de verdad para UI/emails/WhatsApp, derivado del `Shipment`. Cero reescritura, cero ruptura.
