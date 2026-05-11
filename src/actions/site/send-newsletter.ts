'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { render } from '@react-email/components';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { NewsletterEmail } from '@/emails/NewsletterEmail';
import { logger } from '@/lib/logger';

export interface NewsletterProduct {
  title:    string;
  price:    number;
  slug:     string;
  imageUrl: string;
}

interface SendNewsletterInput {
  subject:  string;
  headline: string;
  message:  string;
  products: NewsletterProduct[];
}

const BATCH_SIZE = 50;
const APP_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

export const sendNewsletter = async (input: SendNewsletterInput) => {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, message: 'No autorizado' };

  if (!process.env.RESEND_API_KEY) {
    return { ok: false, message: 'RESEND_API_KEY no está configurado en .env' };
  }

  const subscribers = await prisma.subscriber.findMany({
    where: { unsubscribedAt: null },
    select: { id: true, email: true },
  });

  if (subscribers.length === 0) {
    return { ok: false, message: 'No hay suscriptores activos.' };
  }

  let sent = 0;
  let failed = 0;

  // Enviar en batches para respetar los límites de Resend
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    const emails = await Promise.all(
      batch.map(async (sub) => {
        const html = await render(
          NewsletterEmail({
            headline:     input.headline,
            message:      input.message,
            products:     input.products,
            subscriberId: sub.id,
            appUrl:       APP_URL,
          })
        );
        return {
          from:    `KYZZ <${EMAIL_FROM}>`,
          to:      sub.email,
          subject: input.subject,
          html,
        };
      })
    );

    try {
      await resend.batch.send(emails);
      sent += batch.length;
    } catch (err) {
      logger.error({ error: String(err), batch: i }, 'Error enviando batch de newsletter');
      failed += batch.length;
    }
  }

  return {
    ok: sent > 0,
    message: failed > 0
      ? `Enviado a ${sent} suscriptores. Fallaron ${failed}.`
      : `Newsletter enviado a ${sent} suscriptores.`,
    sent,
    failed,
  };
};
