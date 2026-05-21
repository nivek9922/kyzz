'use server';

import { signIn } from '@/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export type AuthState = { status: 'success' | 'error'; nonce: number } | undefined;

export async function authenticate(
  prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  // Máx. 10 intentos por IP cada 5 min — frena fuerza bruta y credential stuffing.
  const ip = await getClientIp();
  if (!rateLimit(`login:${ip}`, 10, 300_000)) {
    return { status: 'error', nonce: Date.now() };
  }

  try {
    await signIn('credentials', {
      ...Object.fromEntries(formData),
      redirect: false,
    });
    return { status: 'success', nonce: Date.now() };
  } catch {
    return { status: 'error', nonce: Date.now() };
  }
}

export const login = async (email: string, password: string) => {
  // Misma cuota que authenticate (comparten bucket por IP).
  const ip = await getClientIp();
  if (!rateLimit(`login:${ip}`, 10, 300_000)) {
    return { ok: false, message: 'Demasiados intentos, espera unos minutos.' };
  }

  try {
    await signIn('credentials', { email, password });
    return { ok: true };
  } catch {
    return { ok: false, message: 'No se pudo iniciar sesión' };
  }
};

export async function loginWithGoogle() {
  await signIn('google', { redirectTo: '/' });
}

