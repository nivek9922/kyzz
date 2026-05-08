import Link from 'next/link';
import { titleFont } from '@/config/fonts';

export default function EmptyPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="w-12 h-px bg-kyzz-secondary" />
      <h1 className={`${titleFont.className} text-2xl font-normal text-kyzz-dark`}>
        Tu carrito está vacío
      </h1>
      <p className="text-sm text-kyzz-muted max-w-xs">
        Parece que aún no has añadido ninguna pieza a tu selección.
      </p>
      <Link href="/" className="btn-primary-outline mt-2">
        Explorar colección
      </Link>
    </div>
  );
}