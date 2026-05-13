"use client";

import { useEffect, useActionState } from 'react';
import Link from "next/link";
import { useFormStatus } from "react-dom";
import clsx from 'clsx';
import { toast } from 'sonner';

import { authenticate } from "@/actions";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export const LoginForm = () => {
  const [state, dispatch] = useActionState(authenticate, undefined);

  useEffect(() => {
    if (state === 'Success') {
      window.location.replace('/');
    }
    if (state === 'CredentialsSignin') {
      toast.error('Credenciales incorrectas', {
        description: 'Verifica tu correo y contraseña.',
      });
    }
  }, [state]);

  return (
    <form action={dispatch} className="flex flex-col gap-5">

      {/* Email */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted">
          Correo electrónico
        </label>
        <input
          className="kyzz-input"
          type="email"
          name="email"
          autoComplete="email"
        />
      </div>

      {/* Contraseña */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted">
          Contraseña
        </label>
        <input
          className="kyzz-input"
          type="password"
          name="password"
          autoComplete="current-password"
        />
      </div>

      <LoginButton />

      {/* Divisor */}
      <div className="flex items-center gap-4 my-1">
        <div className="flex-1 h-px bg-kyzz-secondary" />
        <span className="text-[10px] tracking-widest text-kyzz-muted uppercase">o</span>
        <div className="flex-1 h-px bg-kyzz-secondary" />
      </div>

      <GoogleSignInButton />

      {/* Divisor */}
      <div className="flex items-center gap-4 my-1">
        <div className="flex-1 h-px bg-kyzz-secondary" />
        <span className="text-[10px] tracking-widest text-kyzz-muted uppercase">o</span>
        <div className="flex-1 h-px bg-kyzz-secondary" />
      </div>

      <Link
        href="/auth/new-account"
        className="text-center text-[11px] tracking-[0.2em] uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors py-3 border border-kyzz-secondary hover:border-kyzz-primary"
      >
        Crear una cuenta nueva
      </Link>
    </form>
  );
};

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx('btn-primary', { 'opacity-60 cursor-not-allowed': pending })}
    >
      {pending ? 'Ingresando...' : 'Ingresar'}
    </button>
  );
}

