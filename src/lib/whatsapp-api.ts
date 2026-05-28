/**
 * Cliente HTTP para la Meta WhatsApp Business Cloud API.
 * Todas las funciones son no-ops silenciosos si WHATSAPP_API_TOKEN no está definido,
 * lo que permite desplegar sin la API activa y activarla cuando Meta apruebe el negocio.
 */

const PHONE_ID  = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
const API_TOKEN = process.env.WHATSAPP_API_TOKEN ?? '';
const BASE_URL  = `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`;

function isEnabled(): boolean {
  return Boolean(API_TOKEN && PHONE_ID);
}

async function post(body: object): Promise<void> {
  if (!isEnabled()) return;
  const res = await fetch(BASE_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    console.error('[whatsapp-api] Error:', res.status, err);
  }
}

/** Envía un mensaje de texto libre (solo dentro de una ventana de 24h). */
export async function sendText(to: string, text: string): Promise<void> {
  return post({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text, preview_url: false },
  });
}

/**
 * Envía una plantilla aprobada por Meta.
 * @param to   Número en formato E.164 sin + (ej. "573001234567")
 * @param name Nombre exacto de la plantilla aprobada en Meta Business Manager
 * @param params Parámetros en orden: {{1}}, {{2}}, …
 */
export async function sendTemplate(
  to:     string,
  name:   string,
  params: string[],
): Promise<void> {
  return post({
    messaging_product: 'whatsapp',
    to,
    type:     'template',
    template: {
      name,
      language: { code: 'es_CO' },
      components: params.length > 0 ? [{
        type:       'body',
        parameters: params.map((text) => ({ type: 'text', text })),
      }] : [],
    },
  });
}

/** Marca un mensaje entrante como leído (activa los ticks azules). */
export async function markAsRead(messageId: string): Promise<void> {
  return post({
    messaging_product: 'whatsapp',
    status:   'read',
    message_id: messageId,
  });
}
