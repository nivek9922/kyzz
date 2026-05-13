import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { IoPersonOutline, IoMailOutline, IoShieldCheckmarkOutline } from 'react-icons/io5';
import { titleFont } from '@/config/fonts';
import { ChangePasswordForm } from './ui/ChangePasswordForm';

export const metadata = { title: 'Mi cuenta — Admin KYZZ' };

export default async function AdminCuentaPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');

  const isOAuthUser = !session.user.image?.includes('cloudinary') && session.user.image;

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Admin</p>
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Mi cuenta
        </h1>
        <div className="w-6 h-px bg-kyzz-secondary mt-3" />
      </div>

      {/* Info del usuario */}
      <div className="kyzz-panel p-8 mb-6">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-6">
          Información de la cuenta
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <IoPersonOutline size={14} className="text-kyzz-muted shrink-0" />
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-kyzz-muted">Nombre</p>
              <p className="text-sm text-kyzz-dark mt-0.5">{session.user.name ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <IoMailOutline size={14} className="text-kyzz-muted shrink-0" />
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-kyzz-muted">Correo</p>
              <p className="text-sm text-kyzz-dark mt-0.5">{session.user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <IoShieldCheckmarkOutline size={14} className="text-kyzz-muted shrink-0" />
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-kyzz-muted">Rol</p>
              <p className="text-sm text-kyzz-dark mt-0.5 capitalize">{session.user.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="kyzz-panel p-8">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-8">
          Seguridad · Contraseña
        </p>
        {isOAuthUser ? (
          <p className="text-sm text-kyzz-muted leading-relaxed">
            Tu cuenta está vinculada con Google. No puedes cambiar la contraseña desde aquí.
          </p>
        ) : (
          <ChangePasswordForm />
        )}
      </div>

    </div>
  );
}
