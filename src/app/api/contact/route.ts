import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'El nombre es muy corto').max(100),
  email: z.string().email('Email inválido'),
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

    const { name, email, message } = result.data;

    // ── Log en consola (reemplazar con nodemailer / Resend / etc. en producción)
    console.log('─── Nuevo mensaje de contacto ───');
    console.log(`Nombre:  ${name}`);
    console.log(`Email:   ${email}`);
    console.log(`Mensaje: ${message}`);
    console.log('─────────────────────────────────');

    // TODO: integrar servicio de email
    // await resend.emails.send({ from: '...', to: 'hola@kyzz.co', ... });

    return NextResponse.json({ ok: true, message: 'Mensaje recibido' });
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Error al procesar el mensaje' },
      { status: 500 }
    );
  }
}
