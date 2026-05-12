'use server';

import { signIn } from '@/auth';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', {
      ...Object.fromEntries(formData),
      redirect: false,
    });
    return 'Success';
  } catch {
    return 'CredentialsSignin';
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

