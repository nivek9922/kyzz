import { titleFont } from '@/config/fonts';
import { RegisterForm } from './ui/RegisterForm';

export default function NewAccountPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 sm:pt-36">
      <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-3">Únete a Kyzz</p>
      <h1 className={`${titleFont.className} text-4xl font-normal text-kyzz-dark mb-1`}>Crear cuenta</h1>
      <div className="w-8 h-px bg-kyzz-secondary mb-10" />
      <RegisterForm />
    </div>
  );
}