/**
 * Motor de flujos de conversación para WhatsApp (Nivel 2 — sin IA).
 * Maneja un árbol de reglas basado en palabras clave y estado de sesión.
 * Cuando el Nivel 3 (con IA) se active, este archivo se reemplaza por una
 * llamada a Claude con function calling; la infraestructura (sesiones,
 * webhook, markAsRead) no cambia.
 */

import prisma from '@/lib/prisma';
import { sendText, markAsRead } from '@/lib/whatsapp-api';

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutos de inactividad

const ADMIN_PHONE = process.env.WHATSAPP_ADMIN_PHONE ?? '';

// ── Textos ──────────────────────────────────────────────────────────────────

const MENU = `Hola 🤍 Soy el asistente de KYZZ.

¿En qué te ayudo?
1️⃣ Estado de mi pedido
2️⃣ Envíos y tiempos
3️⃣ Guía de tallas
4️⃣ Métodos de pago
5️⃣ Hablar con alguien del equipo`;

const SHIPPING_INFO = `📦 *Envíos KYZZ*

• Colombia: 3-5 días hábiles con TCC o Servientrega.
• Envío gratis en pedidos desde $250.000 COP.
• Recibirás un código de rastreo cuando tu pedido sea despachado.

¿Necesitas algo más? Escribe MENÚ para volver al inicio.`;

const SIZE_GUIDE = `📏 *Guía de tallas KYZZ*

| Talla | Busto | Cintura | Cadera |
| XS    | 78–82 | 60–64   | 86–90  |
| S     | 83–87 | 65–69   | 91–95  |
| M     | 88–92 | 70–74   | 96–100 |
| L     | 93–97 | 75–79   | 101–105|
| XL    | 98–102| 80–84   | 106–110|

Medidas en centímetros.
Si estás entre dos tallas, te recomendamos subir una.

¿Tienes dudas de talla? Escribe *5* y te conectamos con el equipo. 🤍`;

const PAYMENT_INFO = `💳 *Métodos de pago KYZZ*

• Tarjeta débito/crédito (Wompi)
• PSE — transferencia bancaria
• Nequi
• Contraentrega (pago en efectivo al recibir)

¿Necesitas algo más? Escribe MENÚ.`;

const ESCALATION_RESPONSE = `Te conectamos con alguien del equipo ahora mismo 🤍
Responden en horario comercial (lun–sáb 9am–6pm).`;

const NOT_FOUND_ORDER = `No encontré esa orden en nuestro sistema.

Verifica el número e inténtalo de nuevo, o escribe *MENÚ* para volver al inicio.`;

// ── Tipos ────────────────────────────────────────────────────────────────────

type SessionContext = Record<string, string>;

// ── Punto de entrada ────────────────────────────────────────────────────────

export async function handleIncomingMessage(
  phone:     string,
  body:      string,
  messageId: string,
): Promise<void> {
  await markAsRead(messageId);

  const normalized = body.toLowerCase().trim();
  const session    = await getOrCreateSession(phone);

  // Sesión expirada → resetear como nueva
  if (new Date(session.expiresAt) < new Date()) {
    await resetSession(phone);
    await sendText(phone, MENU);
    return;
  }

  // ── Router principal ─────────────────────────────────────────────────────

  // Estado: esperando el número de pedido
  if (session.step === 'awaiting_order_id') {
    await handleOrderLookup(phone, normalized);
    return;
  }

  // Estado: human_handoff — bot pausado, el equipo atiende directamente
  if (session.step === 'human_handoff') {
    // No responder; el equipo humano lleva la conversación.
    return;
  }

  // Palabras que resetean al menú
  const isMenuTrigger = ['menu', 'menú', 'inicio', 'hola', 'hi', 'buenas', 'buenas!', '0'].includes(normalized);
  if (isMenuTrigger || session.step === 'idle') {
    await resetSession(phone);
    await sendText(phone, MENU);
    return;
  }

  // Opciones del menú
  switch (normalized) {
    case '1':
      await setStep(phone, 'awaiting_order_id');
      await sendText(phone, '¿Cuál es tu número de pedido? Puedes encontrarlo en el email de confirmación o en KYZZ.co en "Mis pedidos". 📋');
      break;
    case '2':
      await sendText(phone, SHIPPING_INFO);
      break;
    case '3':
      await sendText(phone, SIZE_GUIDE);
      break;
    case '4':
      await sendText(phone, PAYMENT_INFO);
      break;
    case '5':
      await escalateToHuman(phone, `El cliente escribió: "${body}"`);
      break;
    default:
      // Palabras clave
      if (['pedido', 'orden', 'donde', 'dónde', 'estado', 'rastreo'].some(kw => normalized.includes(kw))) {
        await setStep(phone, 'awaiting_order_id');
        await sendText(phone, '¿Cuál es tu número de pedido? Lo encuentras en el email de confirmación. 📋');
      } else if (['devoluci', 'cambio', 'reembolso', 'cancelar'].some(kw => normalized.includes(kw))) {
        await escalateToHuman(phone, `Solicitud de devolución/cambio: "${body}"`);
      } else if (['talla', 'tallas', 'medida', 'medidas', 'talle'].some(kw => normalized.includes(kw))) {
        await sendText(phone, SIZE_GUIDE);
      } else if (['envio', 'envío', 'demora', 'cuando', 'cuándo', 'días', 'dias'].some(kw => normalized.includes(kw))) {
        await sendText(phone, SHIPPING_INFO);
      } else {
        // Texto no reconocido → escalar
        await escalateToHuman(phone, `Mensaje no reconocido: "${body}"`);
      }
  }

  await refreshSession(phone);
}

// ── Búsqueda de pedido ───────────────────────────────────────────────────────

async function handleOrderLookup(phone: string, input: string): Promise<void> {
  if (input === 'menu' || input === 'menú') {
    await resetSession(phone);
    await sendText(phone, MENU);
    return;
  }

  // Buscar por los últimos 8 chars del UUID (lo que ve el cliente en los emails)
  const shortId = input.replace(/[^a-z0-9]/g, '').toUpperCase();

  const order = await prisma.order.findFirst({
    where: {
      AND: [
        { cancelledAt: null },
        {
          OR: [
            // Coincidencia por sufijo del UUID (ej. "8D18B5C1")
            { id: { endsWith: shortId.toLowerCase() } },
            // Coincidencia por teléfono del cliente (solo muestra el más reciente)
            { OrderAddress: { phone: { contains: phone.slice(-10) } } },
          ],
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id:             true,
      isPaid:         true,
      paymentMethod:  true,
      shippingStatus: true,
      trackingCode:   true,
      total:          true,
      createdAt:      true,
    },
  });

  if (!order) {
    await sendText(phone, NOT_FOUND_ORDER);
    return;
  }

  const statusLabel: Record<string, string> = {
    pending:    'Pendiente de despacho',
    processing: 'En preparación',
    shipped:    '📦 En camino',
    delivered:  '✅ Entregado',
    returned:   'Devuelto',
  };

  const payLabel = order.isPaid
    ? order.paymentMethod === 'cod' ? 'Cobrado en entrega' : 'Pagado'
    : order.paymentMethod === 'cod' ? 'Pago contraentrega al recibir' : 'Pendiente de pago';

  let msg = `*Pedido #${order.id.split('-').at(-1)?.toUpperCase()}* 🤍\n\n`;
  msg += `Estado: ${statusLabel[order.shippingStatus] ?? order.shippingStatus}\n`;
  msg += `Pago: ${payLabel}\n`;
  if (order.trackingCode) msg += `Rastreo: ${order.trackingCode}\n`;
  msg += `\nEscribe *MENÚ* para volver al inicio o *5* para hablar con el equipo.`;

  await sendText(phone, msg);
  await resetSession(phone);
}

// ── Escalado a humano ────────────────────────────────────────────────────────

async function escalateToHuman(phone: string, summary: string): Promise<void> {
  await setStep(phone, 'human_handoff');
  await sendText(phone, ESCALATION_RESPONSE);
  if (ADMIN_PHONE) {
    await sendText(
      ADMIN_PHONE,
      `💬 *Nuevo mensaje de +${phone}*\n${summary}\n\nResponde directamente a este número.`,
    );
  }
}

// ── Gestión de sesión ────────────────────────────────────────────────────────

async function getOrCreateSession(phone: string) {
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  return prisma.whatsAppSession.upsert({
    where:  { phone },
    update: {},
    create: { phone, step: 'idle', expiresAt },
  });
}

async function setStep(phone: string, step: string, context?: SessionContext) {
  await prisma.whatsAppSession.update({
    where: { phone },
    data: {
      step,
      context:   context ?? undefined,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
}

async function refreshSession(phone: string) {
  await prisma.whatsAppSession.update({
    where: { phone },
    data:  { expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
}

async function resetSession(phone: string) {
  await prisma.whatsAppSession.update({
    where: { phone },
    data:  { step: 'idle', context: undefined, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
}
