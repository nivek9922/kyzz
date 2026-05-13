'use server';

import bcryptjs from 'bcryptjs';
import { z } from 'zod';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const schema = z.object({
  currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
  newPassword:     z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export const changeOwnPassword = async (formData: FormData) => {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: 'No autorizado' };

  const parsed = schema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword:     formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { ok: false, message: first.message };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, message: 'Usuario no encontrado' };

  if (!user.password) {
    return { ok: false, message: 'Tu cuenta usa Google OAuth — no tiene contraseña local.' };
  }

  const valid = bcryptjs.compareSync(parsed.data.currentPassword, user.password);
  if (!valid) return { ok: false, message: 'Contraseña actual incorrecta' };

  const hashed = bcryptjs.hashSync(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return { ok: true, message: 'Contraseña actualizada correctamente' };
};
