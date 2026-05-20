import Link from 'next/link';
import { IoPersonAddOutline } from 'react-icons/io5';
import { titleFont } from '@/config/fonts';

interface Props {
  email:   string | null;
  orderId: string;
}

export const GuestOrderPrompt = ({ email, orderId }: Props) => {
  const registerUrl = `/auth/new-account?${
    email ? `email=${encodeURIComponent(email)}&` : ''
  }callbackUrl=${encodeURIComponent(`/orders/${orderId}`)}`;

  const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent(`/orders/${orderId}`)}`;

  return (
    <div className="border border-kyzz-secondary/80 bg-kyzz-tertiary/50 p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="shrink-0 w-7 h-7 border border-kyzz-secondary flex items-center justify-center mt-0.5">
          <IoPersonAddOutline className="w-3.5 h-3.5 text-kyzz-primary" />
        </div>
        <div>
          <p className={`${titleFont.className} text-[15px] font-normal text-kyzz-dark leading-snug`}>
            Sigue el estado de tu pedido en tiempo real
          </p>
          <p className="text-[12px] text-kyzz-muted mt-1.5 leading-relaxed">
            Crea tu cuenta con{' '}
            {email && (
              <span className="text-kyzz-dark font-medium">{email}</span>
            )}{' '}
            y este pedido aparecerá automáticamente en tu historial.
            Sin búsquedas en el correo.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <Link href={registerUrl} className="btn-primary text-center py-2.5 text-[11px] tracking-widest flex-1">
          Crear cuenta
        </Link>
        <Link href={loginUrl} className="btn-secondary text-center py-2.5 text-[11px] tracking-widest flex-1">
          Ya tengo cuenta
        </Link>
      </div>
    </div>
  );
};
