'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';
import { changeOwnPassword } from '@/actions/user/change-own-password';

type FormInputs = {
  currentPassword: string;
  newPassword:     string;
  confirmPassword: string;
};

const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted">{label}</label>
    {children}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

export const ChangePasswordForm = () => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormInputs>();

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setLoading(true);
    const fd = new FormData();
    fd.append('currentPassword', data.currentPassword);
    fd.append('newPassword',     data.newPassword);
    fd.append('confirmPassword', data.confirmPassword);

    const result = await changeOwnPassword(fd);

    if (!result.ok) {
      toast.error('No se pudo cambiar la contraseña', { description: result.message });
    } else {
      toast.success(result.message);
      reset();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 max-w-sm">

      <Field label="Contraseña actual" error={errors.currentPassword?.message}>
        <input
          type="password"
          autoComplete="current-password"
          className={`kyzz-input ${errors.currentPassword ? 'border-red-400' : ''}`}
          {...register('currentPassword', { required: 'Campo obligatorio' })}
        />
      </Field>

      <div className="w-full h-px bg-kyzz-secondary" />

      <Field label="Nueva contraseña" error={errors.newPassword?.message}>
        <input
          type="password"
          autoComplete="new-password"
          className={`kyzz-input ${errors.newPassword ? 'border-red-400' : ''}`}
          {...register('newPassword', {
            required: 'Campo obligatorio',
            minLength: { value: 8, message: 'Mínimo 8 caracteres' },
          })}
        />
      </Field>

      <Field label="Confirmar nueva contraseña" error={errors.confirmPassword?.message}>
        <input
          type="password"
          autoComplete="new-password"
          className={`kyzz-input ${errors.confirmPassword ? 'border-red-400' : ''}`}
          {...register('confirmPassword', {
            required: 'Campo obligatorio',
            validate: (v) => v === watch('newPassword') || 'Las contraseñas no coinciden',
          })}
        />
      </Field>

      <button
        type="submit"
        disabled={loading}
        className={`btn-primary mt-2 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Guardando...' : 'Actualizar contraseña'}
      </button>

    </form>
  );
};
