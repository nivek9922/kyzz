'use server';

import prisma from '@/lib/prisma';

interface CartItem {
  id:        string;
  title:     string;
  price:     number;
  quantity:  number;
  size:      string;
  slug:      string;
  image?:    string;
  colorName?: string;
  variantId?: string;
}

export async function captureAbandonedCart(email: string, items: CartItem[]) {
  if (!email || items.length === 0) return;

  try {
    // Upsert: si ya existe un carrito sin emailSentAt para este email, actualiza los items
    const existing = await prisma.abandonedCart.findFirst({
      where: { email, emailSentAt: null, recoveredAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      await prisma.abandonedCart.update({
        where: { id: existing.id },
        data:  { items: items as any },
      });
    } else {
      await prisma.abandonedCart.create({
        data: { email, items: items as any },
      });
    }
  } catch {
    // Silencioso: no interrumpe el flujo de checkout
  }
}

export async function markCartRecovered(token: string) {
  try {
    const cart = await prisma.abandonedCart.findUnique({
      where: { recoveryToken: token },
    });
    if (!cart || cart.recoveredAt) return null;

    await prisma.abandonedCart.update({
      where: { recoveryToken: token },
      data:  { recoveredAt: new Date() },
    });

    return cart.items as unknown as CartItem[];
  } catch {
    return null;
  }
}
