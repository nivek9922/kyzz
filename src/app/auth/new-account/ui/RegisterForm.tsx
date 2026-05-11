"use client";

import Link from 'next/link';
import { SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { login, registerUser } from '@/actions';
import { useState } from 'react';

type FormInputs = {
  name: string;
  email: string;
  password: string;
};

export const RegisterForm = () => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormInputs>();

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setLoading(true);
    const { name, email, password } = data;

    const resp = await registerUser(name, email, password);

    if (!resp.ok) {
      toast.error('No se pudo crear la cuenta', { description: resp.message });
      setLoading(false);
      return;
    }

    toast.success('Cuenta creada', { description: 'Bienvenida a KYZZ.' });
    await login(email.toLowerCase(), password);
    window.location.replace('/');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

      {/* Nombre */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted">
          Nombre completo
        </label>
        <input
          className={`kyzz-input ${errors.name ? 'border-red-400' : ''}`}
          type="text"
          autoFocus
          autoComplete="name"
          {...register('name', { required: true })}
        />
        {errors.name && <p className="text-xs text-red-500">El nombre es obligatorio</p>}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted">
          Correo electrónico
        </label>
        <input
          className={`kyzz-input ${errors.email ? 'border-red-400' : ''}`}
          type="email"
          autoComplete="email"
          {...register('email', { required: true, pattern: /^\S+@\S+$/i })}
        />
        {errors.email && <p className="text-xs text-red-500">Correo electrónico inválido</p>}
      </div>

      {/* Contraseña */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] tracking-[0.2em] uppercase text-kyzz-muted">
          Contraseña
        </label>
        <input
          className={`kyzz-input ${errors.password ? 'border-red-400' : ''}`}
          type="password"
          autoComplete="new-password"
          {...register('password', { required: true, minLength: 6 })}
        />
        {errors.password && <p className="text-xs text-red-500">Mínimo 6 caracteres</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`btn-primary ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>

      {/* Divisor */}
      <div className="flex items-center gap-4 my-1">
        <div className="flex-1 h-px bg-kyzz-secondary" />
        <span className="text-[10px] tracking-widest text-kyzz-muted uppercase">o</span>
        <div className="flex-1 h-px bg-kyzz-secondary" />
      </div>

      <Link
        href="/auth/login"
        className="text-center text-[11px] tracking-[0.2em] uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors py-3 border border-kyzz-secondary hover:border-kyzz-primary"
      >
        Ya tengo cuenta — Ingresar
      </Link>
    </form>
  );
};

