# KYZZ — WhatsApp Automatizado: Estado actual y lo que falta

> Última actualización: 2026-05-28
> Restricción permanente: nunca commitear/pushear sin que el dueño lo pida.

---

## Nivel 1 — COMPLETADO ✅

Stock reservado, contraentrega, pedidos manuales, trazabilidad de canales, dashboard de métricas.

| Área | Archivos |
|---|---|
| Stock reservado (`stock`, `reserved`, `available`) | `src/lib/stock-ops.ts` |
| Contraentrega web (selector + instrucciones al cliente) | `PlaceOrder.tsx`, `/orders/[id]/page.tsx` |
| Pedido manual admin (WhatsApp / Instagram / otro) | `/admin/orders/nuevo/`, `create-manual-order.ts` |
| Canal de venta excluye "web" en pedidos manuales | `ManualOrderForm.tsx` |
| Confirmación COD en ShippingPanel | `ShippingPanel.tsx`, `confirmCodOrder` |
| Marcar como pagado (prepaid manual) con referencia + comprobante | `ShippingPanel.tsx`, `mark-order-as-paid.ts`, `upload-proof-image.ts` |
| Comprobante visible en panel de transacción | `admin/orders/[id]/page.tsx` |
| Idempotencia en `markOrderAsPaid` (no sobreescribe Wompi) | `mark-order-as-paid.ts` |
| Commit de stock al despachar | `update-order-shipping.ts` → `commitStock` |
| Cobro registrado al entregar COD | `paymentGateway=cash` en delivered |
| Cancelación: prepaid >24h / COD sin confirmar expirado | `cancel-unpaid-orders.ts` |
| Botón flotante WhatsApp | `WhatsappFloat.tsx`, `src/lib/whatsapp.ts` |
| "Pregunta por esta prenda" en PDP | `ProductDetailClient.tsx` |
| Link WhatsApp en footer | `Footer.tsx` |
| Métricas por canal y COD en dashboard admin | `admin/page.tsx` |
| Email confirmación COD web | `place-order.ts` |
| Email confirmación pedido manual (si hay email) | `create-manual-order.ts` |
| Timeline COD sin "Pago confirmado" — correcto orden | `OrderTimeline.tsx` |
| Enums `SalesChannel`, `PaymentMethod`, `paymentProofUrl` | `prisma/schema.prisma` |
| Variables documentadas en `.env.example` | `.env.example` |

---

## Nivel 2 (Sin IA) — CÓDIGO LISTO ✅ — Esperando Meta

Todo el código está escrito y el TypeScript compila limpio.
**No se puede activar hasta que Meta apruebe el negocio** (pasos F y G dependen de eso).

### Código implementado

| Paso | Archivo | Estado |
|---|---|---|
| A1 | Emails COD (web + manual) | ✅ ya en Nivel 1 |
| A2 | `captureAbandonedCart` desde checkout | ✅ `PlaceOrder.tsx` |
| B  | Cliente HTTP Meta Cloud API | ✅ `src/lib/whatsapp-api.ts` |
| C  | Webhook `/api/whatsapp/webhook` (GET verify + POST HMAC) | ✅ `route.ts` |
| D  | Modelo `WhatsAppSession` + migración aplicada | ✅ `prisma/schema.prisma` |
| E  | Motor de flujos de conversación (árbol de reglas) | ✅ `src/lib/whatsapp-flows.ts` |
| H  | CSP: `graph.facebook.com` en `connect-src` | ✅ `src/middleware.ts` |
| env | 5 variables WA documentadas | ✅ `.env.example` |

### Flujos implementados en `whatsapp-flows.ts`

Cuando el cliente escribe por WhatsApp, el bot responde:

```
"hola" / "menú" / cualquier texto desconocido
  → Menú principal (5 opciones)

"1" o "pedido" / "orden"
  → Pide número de pedido → busca en BD → responde con estado + tracking

"2" o "envío"
  → Texto estático de tiempos y costos

"3" o "talla" / "medidas"
  → Guía de tallas con tabla cm

"4" o "pago"
  → Métodos de pago disponibles

"5" / "devolución" / "cancelar" / mensaje no reconocido
  → Escalado al admin: bot pausa, notifica a WHATSAPP_ADMIN_PHONE
  → Bot no responde más hasta que el admin resetee la sesión
```

Sesiones con TTL de 30 min. Si el cliente escribe pasados 30 min, la sesión se reinicia.

---

### Lo que falta para activar (pasos externos + código pendiente)

#### Paso F — Plantillas de mensaje (EXTERNO — requiere Meta aprobado)

Crear y someter estas plantillas en Meta Business Manager:

| Nombre | Cuándo se envía | Variables |
|---|---|---|
| `kyzz_order_cod_received` | Al crear orden COD (web o manual) | nombre, #pedido corto, total |
| `kyzz_order_shipped` | Al marcar "Despachado" | nombre, #pedido corto, tracking |
| `kyzz_cod_confirmation` | Al crear orden COD (pide confirmación) | nombre, ciudad, total |

Textos sugeridos en `docs/whatsapp-ia-plan.md`.

#### Paso G — Notificaciones automáticas en order actions (CÓDIGO — 2-3h)

Cuando Meta apruebe las plantillas, agregar en:

- `src/actions/order/place-order.ts` — si `paymentMethod === 'cod'` → `sendTemplate(phone, 'kyzz_order_cod_received', [...])`
- `src/actions/order/create-manual-order.ts` — misma lógica
- `src/actions/order/update-order-shipping.ts` — si `shipped` → `sendTemplate(phone, 'kyzz_order_shipped', [...])`
- `src/actions/order/update-order-shipping.ts` (confirmCodOrder) — `sendText(phone, "✅ Tu pedido fue confirmado...")`

El teléfono está en `order.OrderAddress.phone`. Las acciones ya tienen la estructura; solo falta agregar las llamadas.

#### Prerequisitos externos (iniciar YA, tarda semanas)

1. **Verificar negocio en Meta Business Manager** → business.facebook.com → subir documentos → 1-3 semanas
2. **Número dedicado** → el número de la API no puede ser el mismo de la WhatsApp Business App
3. **BSP: 360dialog** → ~$7 USD/mes → https://www.360dialog.com → conecta tu número a la API
4. **Someter plantillas** (paso F) → 24-72h después de verificación

Una vez que Meta apruebe y tengas `WHATSAPP_API_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`, con agregar esas dos variables al `.env` ya el sistema arranca.

---

## Nivel 3 (Con IA) — EN ESPERA

Documentado en `docs/whatsapp-ia-plan.md`.

Activar cuando:
- Más de 200 conversaciones/mes por WhatsApp, O
- El equipo pasa más de 2h/día respondiendo preguntas repetitivas

El Nivel 2 ya tiene toda la infraestructura. El Nivel 3 solo reemplaza `whatsapp-flows.ts` con una llamada a Claude con function calling. El webhook, las sesiones y las notificaciones no cambian.

Costo estimado Nivel 3: ~$22-57 USD/mes según volumen (ver `docs/whatsapp-ia-plan.md`).

---

## Costo operativo al activar Nivel 2

| Componente | Costo mensual |
|---|---|
| BSP 360dialog | ~$7 USD |
| Plantillas Utility (100 pedidos × $0.03) | ~$3 USD |
| Notificaciones de envío (100 × $0.03) | ~$3 USD |
| Conversaciones user-initiated (cliente escribe primero) | $0 (gratis desde 2024) |
| **Total con 100 pedidos/mes** | **~$13 USD/mes** |
