'use server';

import { signIn } from '@/auth';

export type AuthState = { status: 'success' | 'error'; nonce: number } | undefined;

export async function authenticate(
  prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
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

