'use server';

import prisma from '@/lib/prisma';
import bcryptjs from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  name:     z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80).trim(),
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(100),
});

export const registerUser = async( name: string, email: string, password: string ) => {
  const parsed = registerSchema.safeParse({ name, email, password });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.errors[0].message,
    };
  }

  try {
    const normalizedEmail = parsed.data.email.toLowerCase();

    const user = await prisma.user.create({
      data: {
        name:     parsed.data.name,
        email:    normalizedEmail,
        password: bcryptjs.hashSync(parsed.data.password),
      },
      select: {
        id:    true,
        name:  true,
        email: true,
      },
    });

    // Reclamar órdenes de invitado hechas con este email
    await prisma.order.updateMany({
      where: { guestEmail: normalizedEmail, userId: null },
      data:  { userId: user.id, guestEmail: null },
    });

    return { ok: true, user, message: 'Usuario creado' };

  } catch (error: unknown) {
    // P2002 = unique constraint (email ya registrado)
    if (
      typeof error === 'object' && error !== null &&
      'code' in error && (error as { code: string }).code === 'P2002'
    ) {
      return { ok: false, message: 'Este email ya está registrado' };
    }
    return { ok: false, message: 'No se pudo crear el usuario' };
  }
}