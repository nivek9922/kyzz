# KYZZ — WhatsApp Automatizado: Plan sin IA y Plan con IA

## Context

El Nivel 1 (MVP) ya está implementado y en código. KYZZ ahora tiene: stock reservado, contraentrega en web y por herramienta admin, canal WhatsApp trazable, botón flotante, "Pregunta por esta prenda" en PDP, dashboard de métricas por canal y COD, y todos los flujos de stock correctos.

El siguiente paso es conectar la **WhatsApp Business API** para que las notificaciones de pedido lleguen por WhatsApp y los clientes puedan consultar su estado automáticamente — sin inteligencia artificial, usando reglas simples y plantillas aprobadas. Esto es el **Plan sin IA (Nivel 2)**.

El **Plan con IA (Nivel 3)** queda documentado en `docs/whatsapp-ia-plan.md` para cuando haya volumen real de clientes.

**Restricción permanente**: nunca commitear/pushear sin que el dueño lo pida.

---

## Estado actual — Nivel 1 COMPLETADO ✅

### Lo que ya existe y funciona

| Área | Estado | Archivos |
|---|---|---|
| Stock reservado (`stock`, `reserved`, `available`) | ✅ | `src/lib/stock-ops.ts`, `prisma/schema.prisma` |
| Contraentrega web (selector en checkout + instrucciones) | ✅ | `PlaceOrder.tsx`, `/orders/[id]/page.tsx` |
| Herramienta admin "Nuevo pedido WhatsApp" | ✅ | `/admin/orders/nuevo/`, `create-manual-order.ts` |
| Confirmación COD en ShippingPanel | ✅ | `ShippingPanel.tsx`, `confirmCodOrder` action |
| Commit de stock al despachar | ✅ | `update-order-shipping.ts` → `commitStock` |
| Cobro registrado al entregar COD | ✅ | `paymentGateway=cash` en delivered |
| Cancelación solo de prepaid > 24h | ✅ | `cancel-unpaid-orders.ts` (prepaid + COD expirado) |
| Botón flotante WhatsApp | ✅ | `WhatsappFloat.tsx`, `src/lib/whatsapp.ts` |
| "Pregunta por esta prenda" en PDP | ✅ | `ProductDetailClient.tsx` |
| Link WhatsApp en footer | ✅ | `Footer.tsx` |
| Métricas por canal y COD en dashboard | ✅ | `admin/page.tsx` |
| Enums: `SalesChannel`, `PaymentMethod` | ✅ | `prisma/schema.prisma` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` documentado | ✅ | `.env.example` |

### Gaps del Nivel 1 que se corrigen en el Nivel 2

1. **Email de confirmación para órdenes manuales COD** — `create-manual-order.ts` NO envía email al cliente. El checkout Wompi sí lo hace. Hay que parear el comportamiento.
2. **Email de confirmación para órdenes COD web** — cuando el cliente crea una orden COD el checkout web tampoco envía email (el email solo sale al pagar con Wompi). Hay que enviar una confirmación "recibimos tu pedido, te contactaremos".
3. **Carrito abandonado no tiene disparador** — `AbandonedCartEmail.tsx` existe y `sendAbandonedCartEmails()` corre en el cron, pero `captureAbandonedCart()` nunca se llama desde el checkout. Solo necesita llamarse.

---

## Plan sin IA — Nivel 2

> Objetivo: KYZZ notifica a los clientes por WhatsApp automáticamente (confirmación, envío, COD) y responde preguntas frecuentes con reglas simples. Sin inteligencia artificial. Costo operativo: ~$7-30 USD/mes según volumen.

### Prerequisitos externos (antes de tocar el código)

1. **Verificar negocio en Meta Business Manager** — necesario para usar WhatsApp API. Proceso: 1-3 semanas. Ir a business.facebook.com, subir documentos del negocio.
2. **Número de teléfono dedicado** — el número que use la API NO puede ser el mismo de la WhatsApp Business App. Puede ser un número nuevo.
3. **BSP recomendado: 360dialog** — $7 USD/mes, permite usar Meta Cloud API con bandeja de agentes. Alternativa: usar Meta Cloud API directamente (más técnico, $0/mes de plataforma pero sin bandeja de agentes).
4. **Crear y someter plantillas de mensaje** a Meta para aprobación (24-72h). Ver plantillas más abajo.

### Nuevas variables de entorno

```env
# WhatsApp Business API
WHATSAPP_API_TOKEN="..."                        # Bearer token de Meta o BSP
WHATSAPP_PHONE_NUMBER_ID="..."                 # ID del número en Meta (no el número)
WHATSAPP_VERIFY_TOKEN="kyzz-webhook-secret"    # Token arbitrario para verificar webhook
WHATSAPP_ADMIN_PHONE="573001234567"            # Número del equipo para reenviar mensajes sin respuesta
```

### Paso A — Corrección de gaps del Nivel 1

**A1 — Email de confirmación para COD (web y admin)**

Archivo: `src/actions/order/place-order.ts` y `src/actions/order/create-manual-order.ts`

En ambos, después de crear la orden, si `paymentMethod === 'cod'`, enviar `OrderConfirmationEmail` (el template ya existe) con asunto "Recibimos tu pedido · KYZZ" y cuerpo adaptado: "Te contactaremos para confirmar antes de despachar."

Reusar el patrón de `wompi-check-payment.ts` (líneas 80-107): render template → `resend.emails.send()`. Verificar que el email del cliente venga de `order.user?.email ?? order.guestEmail`.

**A2 — Activar carrito abandonado**

Archivo: `src/app/(shop)/checkout/(checkout)/ui/PlaceOrder.tsx`

Llamar `captureAbandonedCart(email, cart)` desde el cliente cuando el usuario llega a la página de checkout (tiene dirección + carrito). El `sendAbandonedCartEmails()` ya corre en el cron de las 2am. Solo falta la captura.

`captureAbandonedCart` está en `src/actions/order/capture-abandoned-cart.ts`. Es un server action. Llamarlo en el `useEffect` de montaje de `PlaceOrder.tsx` si `cart.length > 0 && email`.

### Paso B — WhatsApp API client

**Nuevo archivo: `src/lib/whatsapp-api.ts`**

Servicio HTTP que encapsula la Meta Cloud API:

```typescript
// Funciones a implementar:
sendText(to: string, body: string): Promise<void>
sendTemplate(to: string, templateName: string, params: string[]): Promise<void>
markAsRead(messageId: string): Promise<void>
```

Endpoint base: `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`
Header: `Authorization: Bearer ${WHATSAPP_API_TOKEN}`

No hay dependencias nuevas — solo `fetch` nativo. Si se usa 360dialog, el endpoint cambia pero la firma es igual.

### Paso C — Webhook para mensajes entrantes

**Nuevo archivo: `src/app/api/whatsapp/webhook/route.ts`**

Dos handlers:
- `GET` — verificación de Meta: compara `hub.verify_token` con `WHATSAPP_VERIFY_TOKEN`, retorna `hub.challenge`.
- `POST` — recibe mensajes. Verificar que el body viene de Meta (comparar `X-Hub-Signature-256` con HMAC-SHA256 del body usando `WHATSAPP_API_TOKEN`). Patrón idéntico al webhook de Wompi (`src/app/api/wompi/webhook/route.ts`).

Estructura del payload entrante a parsear:
```typescript
entry[0].changes[0].value.messages[0] = {
  id: string,
  from: string,  // número del remitente (E.164 sin +)
  type: 'text' | 'interactive',
  text?: { body: string },
  interactive?: { type: 'button_reply', button_reply: { id: string, title: string } }
  timestamp: string,
}
```

### Paso D — Sesiones de conversación

**Nuevo modelo en `prisma/schema.prisma`:**

```prisma
model WhatsAppSession {
  id        String   @id @default(uuid())
  phone     String   @unique
  step      String   @default("idle")   // idle | awaiting_order_id
  context   Json?                        // datos entre pasos (ej. orderId parcial)
  updatedAt DateTime @updatedAt
  expiresAt DateTime                     // sesión expira 30min sin actividad

  @@index([phone])
  @@index([expiresAt])
}
```

Una sola migración pequeña (`add_whatsapp_session`). La sesión permite hacer preguntas de seguimiento sin perder el contexto ("¿Cuál es tu número de pedido?").

### Paso E — Motor de flujos de conversación

**Nuevo archivo: `src/lib/whatsapp-flows.ts`**

Función central: `handleIncomingMessage(phone: string, body: string, messageId: string)`

Árbol de decisión (sin IA, basado en texto normalizado y estado de sesión):

```
Entrada normalizada: toLowerCase().trim()

Si step === "awaiting_order_id":
  → Buscar orden por ID parcial (últimos 8 chars del UUID) o por teléfono
  → Si encuentra: responder con estado
  → Si no: "No encontré esa orden. Escribe tu número de pedido o MENÚ para volver."

Si body contiene "menú", "menu", "inicio", "hola", "hi" — o no hay sesión:
  → Responder con menú principal (ver abajo)

Si body === "1": → Pedir número de pedido (step = awaiting_order_id)
Si body === "2": → Texto estático sobre envíos
Si body === "3": → Texto estático sobre tallas + link a guía
Si body === "4": → Texto estático sobre métodos de pago
Si body === "5": → Escalar a humano (notificar al admin)

Palabras clave:
  "pedido", "orden"  → pedir número de pedido
  "devolución"       → info de política + link
  "cancelar"         → info + link a /orders/{id}
  
Default (no reconocido):  → escalar a humano
```

**Menú principal:**
```
Hola 🤍 Soy el asistente de KYZZ.

¿En qué te ayudo?
1️⃣ Estado de mi pedido
2️⃣ Envíos y tiempos
3️⃣ Tallas y guía
4️⃣ Métodos de pago
5️⃣ Hablar con alguien del equipo
```

**Escalado a humano:** enviar `sendText(WHATSAPP_ADMIN_PHONE, "💬 Nuevo mensaje de ${phone}: ${body}")` para que el equipo responda directamente desde la App.

### Paso F — Plantillas de mensaje (Meta/360dialog)

Estas plantillas deben crearse y someterse para aprobación en Meta Business Manager antes de usarse. Nombre, categoría y variables:

| Nombre | Categoría | Variables | Cuándo se envía |
|---|---|---|---|
| `kyzz_order_cod_received` | Utility | `{{1}}` nombre, `{{2}}` orderId corto, `{{3}}` total | Al crear orden COD (web + admin) |
| `kyzz_order_shipped` | Utility | `{{1}}` nombre, `{{2}}` orderId corto, `{{3}}` tracking | Al marcar `shipped` en ShippingPanel |
| `kyzz_cod_confirmation` | Utility | `{{1}}` nombre, `{{2}}` ciudad, `{{3}}` total | Al crear orden COD (pide confirmación) |

**Texto sugerido `kyzz_order_cod_received`:**
```
Hola {{1}} 🤍 Recibimos tu pedido #{{2}} en KYZZ por {{3}}.
Tu pedido es contraentrega — te contactaremos pronto para confirmar la entrega.
Responde ESTADO para ver tu pedido en cualquier momento.
```

**Texto sugerido `kyzz_order_shipped`:**
```
¡Tu pedido #{{2}} está en camino! 🚚
{{1}}, tu pedido fue despachado.
{{3}}
Responde ESTADO para rastrear tu pedido.
```

**Texto sugerido `kyzz_cod_confirmation`:**
```
Hola {{1}} 🤍 Queremos confirmar tu pedido KYZZ con envío a {{2}}.
Total a pagar: {{3}} (contraentrega).
Responde SÍ para confirmar o NO para cancelar.
```

> Nota: las plantillas de utilidad cuestan ~$0.02-0.04 USD cada una. Con 100 pedidos/mes = $2-4 USD en plantillas.

### Paso G — Enganchar notificaciones en acciones existentes

**`src/actions/order/place-order.ts`** y **`src/actions/order/create-manual-order.ts`**:
- Si `paymentMethod === 'cod'` y `address.phone` existe → llamar `sendTemplate(phone, 'kyzz_order_cod_received', [name, shortId, amount])`.
- Llamar solo si `WHATSAPP_API_TOKEN` está definido (feature flag implícito).

**`src/actions/order/update-order-shipping.ts`**:
- Si `shippingStatus === 'shipped'` → llamar `sendTemplate(phone, 'kyzz_order_shipped', [name, shortId, tracking ?? 'Pronto disponible'])`.
- Teléfono: `order.OrderAddress?.phone` (ya se incluye en la query existente o se agrega al select).

**`src/actions/order/update-order-shipping.ts`** (confirmCodOrder):
- Al confirmar COD → `sendText(phone, "✅ Tu pedido KYZZ fue confirmado. Lo estamos preparando para enviarlo.")`.

### Paso H — CSP y CORS

**`src/middleware.ts`** — agregar `graph.facebook.com` a `connect-src`:
```
https://graph.facebook.com
```
Ya existe el patrón en `CLOUDINARY_DOMAINS`. Misma forma.

### Paso I — Crear `docs/whatsapp-ia-plan.md`

Durante la implementación, crear el archivo `docs/whatsapp-ia-plan.md` con el contenido del Plan con IA detallado al final de este documento.

---

## Archivos a crear o modificar (Nivel 2)

| Archivo | Acción | Qué cambia |
|---|---|---|
| `prisma/schema.prisma` | Modificar | Añadir modelo `WhatsAppSession` |
| `prisma/migrations/...` | Crear | Migración `add_whatsapp_session` |
| `src/lib/whatsapp-api.ts` | **Crear** | Cliente HTTP para Meta Cloud API |
| `src/lib/whatsapp-flows.ts` | **Crear** | Motor de flujos de conversación |
| `src/app/api/whatsapp/webhook/route.ts` | **Crear** | GET (verify) + POST (mensajes) |
| `src/actions/order/place-order.ts` | Modificar | Enviar email + WA notification para COD |
| `src/actions/order/create-manual-order.ts` | Modificar | Enviar email + WA notification |
| `src/actions/order/update-order-shipping.ts` | Modificar | WA notification en shipped + cod confirmed |
| `src/app/(shop)/checkout/(checkout)/ui/PlaceOrder.tsx` | Modificar | Llamar `captureAbandonedCart` |
| `src/middleware.ts` | Modificar | Agregar `graph.facebook.com` a CSP |
| `.env.example` | Modificar | Documentar las 4 nuevas variables |
| `vercel.json` | Verificar | El cron existente ya activa `sendAbandonedCartEmails` |
| `docs/whatsapp-ia-plan.md` | **Crear** | Plan con IA para cuando haya volumen |

Sin dependencias npm nuevas. Todo usa `fetch` nativo y los utils existentes.

---

## Costo operativo Nivel 2

| Componente | Costo mensual |
|---|---|
| BSP 360dialog | ~$7 USD |
| Conversaciones servicio (usuario escribe primero) | **$0** (gratis desde 2024) |
| Plantillas Utility por pedido COD (100 peds x $0.03) | ~$3 USD |
| Plantillas Utility de envío (100 envíos x $0.03) | ~$3 USD |
| **Total estimado con 100 pedidos/mes** | **~$13 USD/mes** |

---

## Verificación (checklist Nivel 2)

1. `npx tsc --noEmit` limpio tras todos los cambios.
2. Webhook verificado: GET a `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=kyzz-webhook-secret&hub.challenge=test` → retorna `test`.
3. Webhook recibe mensaje: POST con payload simulado de Meta → `markAsRead` + flujo ejecutado.
4. Menú: enviar "hola" → llega menú con 5 opciones.
5. Estado de pedido: enviar "1" → pide ID → enviar ID → responde con estado.
6. Escalado: enviar texto desconocido → admin recibe notificación.
7. Email COD: crear orden COD → llega email de confirmación al cliente.
8. Notificación WA envío: marcar `shipped` en admin → cliente recibe WA.
9. Carrito abandonado: llegar a checkout → esperar cron o disparar manualmente → email llega.

---

---

# Plan con IA — Nivel 3
# (Contenido para `docs/whatsapp-ia-plan.md`)

> Este contenido se debe crear como `docs/whatsapp-ia-plan.md` durante la implementación del Nivel 2.

---

```markdown
# KYZZ — WhatsApp con IA (Nivel 3)

## Cuándo activar este plan

Activar cuando se cumplan al menos 2 de estas condiciones:
- Más de 200 conversaciones/mes por WhatsApp
- El equipo pasa más de 2h/día respondiendo preguntas repetitivas
- Tasa de conversión por WhatsApp cae porque los tiempos de respuesta son largos
- Se quiere operar fuera de horario comercial sin perder ventas

## Qué agrega la IA sobre el Nivel 2

| Capacidad | Sin IA (Nivel 2) | Con IA (Nivel 3) |
|---|---|---|
| FAQ | Menú de 5 opciones fijo | Lenguaje natural libre |
| Disponibilidad | Link al producto | Consulta BD en tiempo real + respuesta verbal |
| Tallas | Guía estática | Recomendación según medidas del cliente |
| Outfits | No aplica | Recomienda combinaciones de la colección real |
| Fuera de horario | Menú básico | Atención completa 24/7 |
| Escala a humano | Por default | Solo cuando realmente se necesita |

## Arquitectura

```
Cliente WhatsApp
      ↓
Webhook /api/whatsapp/webhook (ya existe)
      ↓
Claude API (Anthropic) con system prompt + function calling
      ↓
Funciones disponibles para Claude:
  - getProductAvailability(productId, size?, colorId?)  → available: number
  - getOrderStatus(phone, orderId?)                     → status, shippingStatus, tracking
  - searchProducts(query)                               → top 5 productos relevantes
  - getProductDetails(slug)                             → precio, tallas, colores
  - createCartLink(productId, variantId)                → URL directa al producto
  - escalateToHuman(phone, summary)                     → notifica al equipo + pausa bot
```

## System prompt base

```
Eres el asistente de ventas de KYZZ, una tienda de moda femenina premium colombiana.
Tu personalidad es cálida, elegante y directa — como una amiga que sabe de moda.

Reglas:
- Siempre consulta el stock real antes de decir que algo está disponible.
- Si no sabes algo, di "Déjame verificarlo" y usa la herramienta adecuada.
- Para preguntas de tallas, pide las medidas de la cliente (busto/cintura/cadera).
- Para recomendaciones, pregunta el estilo buscado o la ocasión.
- Escala al equipo si: hay queja, pedido con problema, cliente frustrado, o lo pide explícitamente.
- Nunca inventes precios, stock o información de productos.
- Responde en español colombiano, sin tecnicismos.
```

## Función: recomendación de tallas

```typescript
async function recommendSize(measurements: { bust?: number; waist?: number; hips?: number }) {
  // Consultar tabla de tallas del producto específico
  // Comparar con las medidas del cliente
  // Retornar talla recomendada + nota ("si eres más ancha de caderas, sube una talla")
}
```
Inicialmente tabla estática; luego puede mejorar con historial de devoluciones por talla.

## Función: escalado a humano

```typescript
async function escalateToHuman(phone: string, summary: string) {
  // 1. Guardar en BD el contexto de la conversación
  // 2. Notificar al admin por WhatsApp (mensaje con teléfono + resumen)
  // 3. Setear sesión.step = "human_handoff" → bot pausa respuestas automáticas
  // 4. Cuando el equipo retome: borrar el step para reactivar el bot
}
```

## Cuándo escalar (criterios para el system prompt)

- "hablar con alguien", "persona real", "agente"
- Palabras de frustración: "llevo días", "no me han respondido", "están fallando"
- Problemas con pedido ya pagado
- Solicitud de reembolso o devolución
- Monto del pedido > $300.000 COP
- Bot falló 2 veces consecutivas en la misma pregunta

## Costo estimado

| Componente | Costo mensual (200 conv/mes) |
|---|---|
| BSP 360dialog | $7 USD |
| Conversaciones WA | $0-5 USD (mayoría user-initiated = gratis) |
| Claude Sonnet API (~500 tokens/msg, 10 msg/conv) | ~$30-50 USD |
| **Total estimado** | **$37-62 USD/mes** |

## Implementación (sobre Nivel 2)

1. Cambiar `handleIncomingMessage` en `whatsapp-flows.ts` para pasar el mensaje a Claude en vez de al árbol de reglas.
2. Implementar las funciones de herramienta como server actions o funciones puras con Prisma.
3. Mantener el sistema de sesiones (`WhatsAppSession`) para el contexto de la conversación (últimos N mensajes).
4. El `escalateToHuman` queda en ambos niveles: bot notifica al equipo, el team responde directamente.
5. Agregar `ANTHROPIC_API_KEY` a `.env.example`.

## Lo que NO hace la IA (límites importantes)

- No crea órdenes directamente en la BD — genera un link de compra que el cliente completa en la tienda.
- No tiene acceso a datos de pago o tarjetas.
- No puede cambiar estados de órdenes — eso lo hace el admin humano.
- No adivina el stock — siempre consulta la BD en tiempo real.
```
---

## Orden de implementación recomendado

1. **Primero**: Paso A (gaps Nivel 1 — emails COD + activar carrito abandonado). No requiere API externa.
2. **Prerequisito externo**: iniciar verificación de Meta Business Manager hoy (tarda semanas).
3. **Mientras se aprueba Meta**: Pasos B + C + D + E (código, sin aún conectar a Meta real).
4. **Cuando Meta aprueba**: Pasos F + G (plantillas + enganchar a acciones).
5. **Paso H**: CSP y CORS.
6. **Paso I**: crear `docs/whatsapp-ia-plan.md`.