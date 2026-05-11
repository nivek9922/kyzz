import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');

  if (!id) {
    return new NextResponse('Enlace inválido.', { status: 400 });
  }

  const subscriber = await prisma.subscriber.findUnique({ where: { id } });

  if (!subscriber) {
    return new NextResponse('Suscriptor no encontrado.', { status: 404 });
  }

  if (!subscriber.unsubscribedAt) {
    await prisma.subscriber.update({
      where: { id },
      data: { unsubscribedAt: new Date() },
    });
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KYZZ · Cancelada suscripción</title>
  <style>
    body { margin: 0; background: #FAF9F6; font-family: Georgia, serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { text-align: center; max-width: 380px; padding: 60px 40px; border: 1px solid #E3D5CA; }
    .brand { font-size: 18px; letter-spacing: 0.3em; text-transform: uppercase; color: #3D2B1F; margin: 0 0 32px; }
    .title { font-size: 20px; font-weight: normal; color: #3D2B1F; margin: 0 0 16px; }
    .text { font-size: 13px; color: #7A5C50; line-height: 1.7; margin: 0 0 32px; font-family: sans-serif; }
    .link { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #A89080; text-decoration: none; }
    .link:hover { color: #3D2B1F; }
  </style>
</head>
<body>
  <div class="card">
    <p class="brand">KYZZ</p>
    <h1 class="title">Suscripción cancelada</h1>
    <p class="text">Tu correo <strong>${subscriber.email}</strong> ha sido eliminado de nuestra lista. No recibirás más emails de marketing.</p>
    <a href="/" class="link">← Volver a la tienda</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
