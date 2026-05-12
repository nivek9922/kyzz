import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { render } from '@react-email/components';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { ContactNotificationEmail } from '@/emails/ContactNotificationEmail';
import { ContactAutoReplyEmail } from '@/emails/ContactAutoReplyEmail';

const contactSchema = z.object({
  name:    z.string().min(2, 'El nombre es muy corto').max(100),
  email:   z.string().email('Email inválido'),
  subject: z.string().min(1, 'Selecciona un asunto'),
  message: z.string().min(10, 'El mensaje es muy corto').max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = contactSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { ok: false, errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = result.data;
    const EMAIL_CONTACT = process.env.EMAIL_CONTACT ?? EMAIL_FROM;
    const firstName = name.split(' ')[0];

    // Email de notificación al negocio (reply-to = email del usuario para respuesta directa)
    const notificationHtml = await render(ContactNotificationEmail({ senderName: name, senderEmail: email, subject, message }));
    await resend.emails.send({
      from:     EMAIL_FROM,
      to:       EMAIL_CONTACT,
      replyTo:  email,
      subject:  `KYZZ · Nuevo mensaje: ${subject}`,
      html:     notificationHtml,
    });

    // Auto-respuesta al usuario (no bloquea si falla en sandbox)
    try {
      const autoReplyHtml = await render(ContactAutoReplyEmail({ firstName, subject, message }));
      await resend.emails.send({
        from:    EMAIL_FROM,
        to:      email,
        subject: 'KYZZ · Recibimos tu mensaje',
        html:    autoReplyHtml,
      });
    } catch {
      // En sandbox Resend solo permite enviar al email verificado; no bloquea el flujo
    }

    return NextResponse.json({ ok: true, message: 'Mensaje enviado' });
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Error al procesar el mensaje' },
      { status: 500 }
    );
  }
}
