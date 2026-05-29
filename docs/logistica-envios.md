# KYZZ — Capa Logística y Gestión de Envíos (Colombia)

> Cómo KYZZ gestiona los envíos de punta a punta.
>
> **Estado actual:** modo MANUAL implementado y en uso. Integración automática con transportadora = fase futura (cuando el volumen lo justifique).
> **Última actualización:** 2026-05-29.

---

## 1. Decisión actual: modo manual

KYZZ **no integra ninguna transportadora por API por ahora**. El flujo es manual pero estructurado y trazable:

1. El admin genera la guía en la plataforma de su transportadora (Mipaquete, Heka, Envia.com, o directo con Servientrega/Coordinadora/Interrapidísimo).
2. Pega el **número de guía** y elige la **transportadora** en el panel del pedido.
3. KYZZ arma el **link de rastreo clickeable** para que el cliente rastree su pedido.
4. El admin marca el pedido como despachado/entregado a medida que avanza.

**Por qué manual primero:** integrar una transportadora requiere conocer bien el flujo operativo real, tener volumen y elegir el proveedor correcto. Hasta no operar un tiempo y conocer el flujo, integrar es prematuro. La estructura de datos (`Shipment`) ya queda lista para enchufar una API el día que se decida.

---

## 2. Flujos de pedido (todos los canales)

```
COMPRA WEB — PAGO EN LÍNEA (Wompi)
────────────────────────────────────
1. Cliente compra y paga en kyzz.com con Wompi
2. Webhook de Wompi confirma → isPaid = true
3. Admin ve el pedido en /admin/orders/[id]
4. Admin genera la guía en su transportadora y pega el número en KYZZ
5. Admin marca "Despachado" → descuenta stock + email/WhatsApp al cliente
6. Admin marca "Entregado" cuando llega
7. Cliente rastrea en /orders/[id] con el link clickeable

COMPRA WEB — CONTRAENTREGA (COD)
─────────────────────────────────
1. Cliente elige "Pago contraentrega"
2. Admin valida con la clienta por WhatsApp (anti-fraude)
3. Admin pulsa "Confirmar pedido COD" → detiene la expiración de reserva
4. Admin genera la guía y la pega en KYZZ
5. Despacha → cliente paga en efectivo al recibir
6. Admin marca "Entregado" → registra el cobro automáticamente (isPaid + efectivo)

PEDIDO POR REDES SOCIALES (WhatsApp / Instagram)
──────────────────────────────────────────────────
1. Admin crea pedido manual en /admin/orders/nuevo (canal whatsapp/instagram/otro)
2. Si transferencia: confirma pago con referencia + comprobante
   Si COD: confirma como arriba
3. Resto del flujo (guía, despacho, entrega) idéntico

DEVOLUCIÓN (RMA)
─────────────────
1. Cliente solicita devolución desde /orders/[id] (o admin la registra)
2. Admin gestiona en /admin/devoluciones (aprobar/rechazar)
3. Reembolso según método original
```

---

## 3. Anti-fraude contraentrega (COD)

La defensa principal: **confirmación por WhatsApp antes de despachar**.

- `codConfirmedAt`: obligatorio antes de despachar.
- `reservationExpiresAt` + cron diario: COD sin confirmar libera el stock reservado.
- Al marcar "Entregado" un COD → `isPaid=true, paymentGateway='cash'`.

---

## 4. Arquitectura actual (modo manual)

```
src/lib/shipping/
├── carriers.ts              # catálogo de transportadoras + links de rastreo  ★
└── apply-shipping-status.ts # núcleo de transición de estado + email de despacho

src/actions/shipping/
└── upsert-shipment.ts       # el admin registra/edita la guía (carrier + número + flete)

src/app/(shop)/admin/orders/[id]/ui/
├── ShippingManager.tsx      # panel unificado: próximo paso + guía + ajuste manual
└── OrderTimeline.tsx        # línea de tiempo (creado/pagado/enviado/entregado)
```

**Modelos en BD:** `Shipment` guarda la guía manual (carrier, trackingCode, cost). El modelo `TrackingEvent` queda latente en el schema para la fase de integración futura (webhooks) — hoy no se usa.

**Estado cara-al-cliente:** `Order.shippingStatus` (pending → processing → shipped → delivered → returned) es la fuente de verdad para la barra de progreso, los emails y WhatsApp.

---

## 5. El panel del admin

En `/admin/orders/[id]`, el componente `ShippingManager` muestra:

1. **Cabecera** — canal + método de pago + estado actual.
2. **Próximo paso** — la única acción relevante ahora (confirmar COD / confirmar pago / despachar / entregar). Guía al admin sin que tenga que pensar.
3. **Guía de envío** — elegir transportadora + pegar número de guía + flete. Si ya hay guía: la muestra con link de rastreo.
4. **Ajuste manual de estado** (colapsado) — para corregir el estado a mano si algo se salió del flujo normal.

---

## 6. Transportadoras soportadas (rastreo)

El catálogo (`carriers.ts`) tiene links de rastreo para: Interrapidísimo, Servientrega, Coordinadora, TCC, 99minutos, Envia.com, Mensajeros Urbanos (sin link público) y "Otra / manual".

El admin elige la transportadora **real** que aparece en la guía (donde el cliente rastrea), sin importar en qué plataforma/agregador la haya generado.

---

## 7. Integración futura (cuando haya volumen)

Cuando KYZZ tenga volumen y un proveedor elegido, la integración automática se podrá agregar **sin reescribir** lo actual:

- Un cliente API de la transportadora/agregador elegido (Mipaquete, Heka, Envia.com, etc.).
- Generar guía automática al confirmar pago/COD (en vez de pegarla a mano).
- Webhook de tracking → poblar `TrackingEvent` → actualizar estado y notificar solo.
- Descarga de label PDF y recaudo COD conciliado.

El modelo `Shipment` / `TrackingEvent` y el flujo de estados ya están preparados para ese día.
