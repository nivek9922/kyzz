import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp-flows';

/**
 * GET — Verificación inicial del webhook por parte de Meta.
 * Meta hace un GET con hub.mode=subscribe, hub.verify_token y hub.challenge.
 * Si el token coincide, devolvemos el challenge para confirmar la URL.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST — Recibe mensajes y eventos entrantes desde Meta.
 * Verifica la firma HMAC-SHA256 con WHATSAPP_APP_SECRET (si está configurado).
 */
export async function POST(req: NextRequest) {
  // Leer el body como texto para poder verificar la firma antes de parsear JSON
  const rawBody = await req.text();

  // Verificación de firma (opcional en dev, obligatoria en prod)
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const signature = req.headers.get('x-hub-signature-256') ?? '';
    const expected  = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
    if (signature !== expected) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  let payload: WhatsAppPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  // Meta espera siempre 200 inmediato — procesamos de forma asíncrona
  processPayload(payload).catch((err) =>
    console.error('[whatsapp/webhook] Error procesando payload:', err),
  );

  return new NextResponse('OK', { status: 200 });
}

async function processPayload(payload: WhatsAppPayload) {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  if (change?.field !== 'messages') return;

  const messages = change.value?.messages ?? [];
  for (const msg of messages) {
    if (msg.type !== 'text' && msg.type !== 'interactive') continue;

    const phone = msg.from;
    const body  =
      msg.type === 'text'
        ? msg.text?.body ?? ''
        : msg.interactive?.button_reply?.title ?? '';

    if (!phone || !body) continue;
    await handleIncomingMessage(phone, body, msg.id);
  }
}

// ── Tipos del payload de Meta ──────────────────────────────────────────────

interface WhatsAppPayload {
  entry?: {
    changes?: {
      field: string;
      value?: {
        messages?: WaMessage[];
      };
    }[];
  }[];
}

interface WaMessage {
  id:   string;
  from: string;
  type: 'text' | 'interactive' | string;
  timestamp: string;
  text?:        { body: string };
  interactive?: { type: string; button_reply?: { id: string; title: string } };
}
