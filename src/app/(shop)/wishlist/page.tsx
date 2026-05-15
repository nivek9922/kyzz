import { titleFont } from '@/config/fonts';
import { WishlistContent } from './ui/WishlistContent';

export const metadata = { title: 'Favoritos — KYZZ' };

export default function WishlistPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-3">
        Mi cuenta
      </p>
      <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
        Favoritos
      </h1>
      <div className="w-8 h-px bg-kyzz-secondary mt-5" />
      <WishlistContent />
    </div>
  );
}
