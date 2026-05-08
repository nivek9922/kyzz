
import { titleFont } from '@/config/fonts';
import { LoginForm } from './ui/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 sm:pt-36">
      <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-3">Bienvenida de nuevo</p>
      <h1 className={`${titleFont.className} text-4xl font-normal text-kyzz-dark mb-1`}>Ingresar</h1>
      <div className="w-8 h-px bg-kyzz-secondary mb-10" />
      <LoginForm />
    </div>
  );
}