'use server';

import { z } from 'zod';
import { render } from '@react-email/components';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { ContactNotificationEmail } from '@/emails/ContactNotificationEmail';
import { ContactAutoReplyEmail } from '@/emails/ContactAutoReplyEmail';

const contactSchema = z.object({
  name:    z.string().min(2, 'El nombre es muy corto').max(100),
  email:   z.string().email('Email inválido'),
  subject: z.string().min(1, 'Selecciona un asunto'),
  message: z.string().min(10, 'El mensaje es muy corto').max(2000),
});

type FieldErrors = {
  name?:    string[];
  email?:   string[];
  subject?: string[];
  message?: string[];
};

export type ContactState = {
  status: 'success' | 'error' | 'validation';
  message?: string;
  fieldErrors?: FieldErrors;
} | null;

export async function sendContactMessage(
  _prevState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // Máx. 3 mensajes por IP cada minuto — frena spam del formulario.
  const ip = await getClientIp();
  if (!rateLimit(`contact:${ip}`, 3, 60_000)) {
    return { status: 'error', message: 'Demasiados mensajes, espera unos minutos.' };
  }

  const raw = {
    name:    formData.get('name'),
    email:   formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message'),
  };

  const result = contactSchema.safeParse(raw);
  if (!result.success) {
    return { status: 'validation', fieldErrors: result.error.flatten().fieldErrors };
  }

  const { name, email, subject, message } = result.data;
  const EMAIL_CONTACT = process.env.EMAIL_CONTACT ?? EMAIL_FROM;
  const firstName = name.split(' ')[0];

  try {
    const notificationHtml = await render(
      ContactNotificationEmail({ senderName: name, senderEmail: email, subject, message }),
    );
    await resend.emails.send({
      from:    EMAIL_FROM,
      to:      EMAIL_CONTACT,
      replyTo: email,
      subject: `KYZZ · Nuevo mensaje: ${subject}`,
      html:    notificationHtml,
    });

    try {
      const autoReplyHtml = await render(
        ContactAutoReplyEmail({ firstName, subject, message }),
      );
      await resend.emails.send({
        from:    EMAIL_FROM,
        to:      email,
        subject: 'KYZZ · Recibimos tu mensaje',
        html:    autoReplyHtml,
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Contact] Auto-reply no enviado (sandbox Resend):', String(err));
      }
    }

    return { status: 'success' };
  } catch {
    return { status: 'error', message: 'Error al enviar el mensaje. Intenta de nuevo.' };
  }
}
