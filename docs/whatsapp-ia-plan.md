# KYZZ — WhatsApp con IA (Nivel 3)

> **Estado**: En espera. Activar cuando el Nivel 2 (sin IA) esté operativo y se alcance volumen.
> **Depende de**: `docs/plan-conAI-sinAI.md` — el Nivel 2 debe estar completo primero.

---

## Cuándo activar este plan

Activar cuando se cumplan al menos 2 de estas condiciones:

- Más de 200 conversaciones/mes por WhatsApp
- El equipo pasa más de 2h/día respondiendo preguntas repetitivas
- La tasa de conversión por WhatsApp cae porque los tiempos de respuesta son largos
- Se quiere operar fuera de horario comercial sin perder ventas

---

## Qué agrega la IA sobre el Nivel 2 (sin IA)

| Capacidad | Sin IA (Nivel 2) | Con IA (Nivel 3) |
|---|---|---|
| FAQ | Menú de 5 opciones fijo | Lenguaje natural libre — el cliente escribe como quiere |
| Disponibilidad de producto | Link al producto | Consulta BD en tiempo real + respuesta en lenguaje natural |
| Recomendación de tallas | Guía estática | Recomendación según medidas del cliente (busto/cintura/cadera) |
| Recomendación de outfits | No aplica | Combina prendas de la colección real según estilo u ocasión |
| Fuera de horario | Menú básico | Atención completa 24/7 |
| Escala a humano | Por default ante cualquier duda | Solo cuando realmente se necesita |
| Cierre de venta | Solo link → cliente va a la tienda | Link directo a la variante exacta que el cliente quiere |

---

## Arquitectura

```
Cliente WhatsApp
      ↓
Webhook /api/whatsapp/webhook  (ya existe desde Nivel 2)
      ↓
handleIncomingMessage()  →  Claude API (Anthropic)
  system prompt + tools
      ↓
Herramientas disponibles para Claude:
  - getProductAvailability(productId, size?, colorId?)   → available: number
  - getOrderStatus(phone, orderId?)                      → status, shippingStatus, tracking
  - searchProducts(query)                                → top 5 productos relevantes
  - getProductDetails(slug)                              → precio, tallas, colores disponibles
  - createProductLink(slug, variantId?)                  → URL directa al producto/variante
  - escalateToHuman(phone, summary)                      → pausa bot + notifica al equipo
```

El cambio principal sobre el Nivel 2: `whatsapp-flows.ts` reemplaza el árbol de reglas por una llamada a Claude con las herramientas de arriba. La infraestructura (sesiones, webhook, `whatsapp-api.ts`) se reutiliza sin cambios.

---

## System prompt base

```
Eres el asistente de ventas de KYZZ, una tienda de moda femenina premium colombiana.
Tu personalidad es cálida, elegante y directa — como una amiga que sabe de moda.
Hablas en español colombiano, de tú, sin tecnicismos.

Reglas obligatorias:
- SIEMPRE usa getProductAvailability antes de decir que algo está disponible. Nunca inventes stock.
- SIEMPRE usa getProductDetails antes de dar precio o tallas. Nunca inventes datos del producto.
- Si la cliente pide recomendación de talla, pide sus medidas: busto, cintura y cadera en cm.
- Si pide recomendación de outfit, pregunta la ocasión o el estilo que busca.
- Escala al equipo humano si detectas: queja, pedido con problema, frustración, solicitud de reembolso,
  o si el cliente lo pide explícitamente.
- Si no puedes resolver algo con las herramientas disponibles, escala al equipo.
- Nunca prometas descuentos, fechas o condiciones que no estén en el sistema.
- Responde de forma breve y directa — WhatsApp no es un blog.
```

---

## Herramientas (function calling) — implementación

Cada herramienta es una función TypeScript que consulta Prisma directamente.

### `getProductAvailability`

```typescript
async function getProductAvailability(input: {
  productId: string;
  size?: string;
  colorId?: string;
}): Promise<{ available: number; variants: { size: string; colorName: string | null; available: number }[] }> {
  const variants = await prisma.productVariant.findMany({
    where: {
      productId: input.productId,
      ...(input.size    ? { size: input.size as Size }    : {}),
      ...(input.colorId ? { colorId: input.colorId }      : {}),
    },
    select: {
      size:     true,
      stock:    true,
      reserved: true,
      color:    { select: { paletteColor: { select: { name: true } } } },
    },
  });
  return {
    available: variants.reduce((s, v) => s + (v.stock - v.reserved), 0),
    variants:  variants.map((v) => ({
      size:      v.size,
      colorName: v.color?.paletteColor.name ?? null,
      available: v.stock - v.reserved,
    })),
  };
}
```

### `getOrderStatus`

```typescript
async function getOrderStatus(input: { phone: string; orderId?: string }) {
  // 1. Si viene orderId → buscar por UUID parcial (últimos 8 chars)
  // 2. Si no → buscar por OrderAddress.phone (últimas 3 órdenes)
  // Retornar: status, shippingStatus, trackingCode, isPaid, items
}
```

### `escalateToHuman`

```typescript
async function escalateToHuman(input: { phone: string; summary: string }) {
  // 1. Setear WhatsAppSession.step = "human_handoff" (bot deja de responder)
  // 2. Enviar WhatsApp al admin: "💬 Cliente ${phone} necesita ayuda: ${summary}"
  // 3. Responder al cliente: "Te estoy conectando con alguien del equipo 🤍 Responden pronto."
}
```

Para reactivar el bot después de que el equipo atienda: el admin envía `!bot` o se resetea la sesión por tiempo.

---

## Recomendación de tallas

Tabla de referencia estática inicial (mejorable con historial de devoluciones):

| Medida busto (cm) | Cintura (cm) | Cadera (cm) | Talla sugerida |
|---|---|---|---|
| 78–82 | 60–64 | 86–90 | XS |
| 83–87 | 65–69 | 91–95 | S |
| 88–92 | 70–74 | 96–100 | M |
| 93–97 | 75–79 | 101–105 | L |
| 98–102 | 80–84 | 106–110 | XL |

El sistema prompt indica a Claude que pida las 3 medidas y use la tabla para recomendar. Si los valores están en el límite, sugiere subir una talla. Nota de honestidad: "si tienes dudas, escríbenos y te ayudamos."

---

## Cuándo escalar a humano (criterios para el system prompt)

**Escala inmediatamente si el cliente dice:**
- "hablar con alguien", "una persona", "un agente", "equipo"
- "llevo días esperando", "no me han respondido", "están fallando"
- "quiero cancelar mi pedido", "quiero un reembolso", "quiero devolver"
- Monto del pedido > $300.000 COP y el cliente tiene dudas

**Escala automáticamente si:**
- El bot falló 2 veces seguidas en responder la misma pregunta
- Las herramientas retornan error

**NO escala si:**
- El cliente solo pregunta disponibilidad, precio, tallas
- Quiere estado de su pedido (lo resuelve con `getOrderStatus`)
- Pregunta FAQ de envíos o métodos de pago

---

## Costo estimado

| Componente | 100 conv/mes | 300 conv/mes |
|---|---|---|
| BSP 360dialog | $7 USD | $7 USD |
| Conversaciones WA (user-initiated = gratis) | $0–2 USD | $0–5 USD |
| Claude Sonnet 4.6 (~800 tokens input, ~300 output por turno, 8 turnos/conv) | ~$15 USD | ~$45 USD |
| **Total estimado** | **~$22–24 USD/mes** | **~$52–57 USD/mes** |

> Claude Sonnet 4.6 pricing: $3/MTok input, $15/MTok output.
> Cálculo: 100 conv × 8 turnos × (800 input + 300 output) tokens = ~880K tokens/mes → ~$7-15 USD en tokens.

---

## Implementación (sobre Nivel 2 — cambios mínimos)

El Nivel 2 ya tiene toda la infraestructura. El Nivel 3 solo reemplaza la lógica de decisión:

1. **`src/lib/whatsapp-flows.ts`** — reemplazar el árbol de reglas por llamada a Claude con tools. El resto del archivo (sesiones, markAsRead, escalado) permanece igual.
2. **`src/lib/whatsapp-tools.ts`** (nuevo) — implementar las 6 herramientas como funciones puras con Prisma.
3. **`.env.example`** — agregar `ANTHROPIC_API_KEY`.
4. **`npm install @anthropic-ai/sdk`** — única dependencia nueva.

El webhook, las sesiones, las plantillas y los hooks en order actions no cambian.

---

## Lo que la IA NO hace (límites importantes)

- No crea órdenes en la BD — genera un link de compra que el cliente completa en la tienda.
- No tiene acceso a datos de pago, tarjetas ni cuentas bancarias.
- No puede cambiar estados de órdenes — eso lo hace el admin humano.
- No adivina stock — siempre consulta la BD en tiempo real.
- No promete entregas, descuentos ni condiciones que no estén en el sistema.
