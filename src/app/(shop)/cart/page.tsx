import { titleFont } from '@/config/fonts';
import { CartContent } from './ui/CartContent';
import { CartRecommendations } from './ui/CartRecommendations';

export default function CartPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16 mb-16 md:mb-24">

      {/* Cabecera */}
      <div className="mb-12">
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Tu carrito
        </h1>
        <div className="kyzz-divider-left" />
      </div>

      <CartContent />

      {/* Recomendaciones — full width, debajo del carrito */}
      <CartRecommendations />

    </div>
  );
}
