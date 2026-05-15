import Link from 'next/link';
import { titleFont } from '@/config/fonts';
import { ProductsInCart } from './ui/ProductsInCart';
import { OrderSummary } from './ui/OrderSummary';
import { CartRecommendations } from './ui/CartRecommendations';
import { RecentlyViewed } from './ui/RecentlyViewed';
import { CartScrollable } from './ui/CartScrollable';

export default function CartPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16 mb-24">

      {/* Cabecera */}
      <div className="mb-12">
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Tu carrito
        </h1>
        <div className="kyzz-divider-left" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-16 items-start">

        {/* Productos */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">
              Artículos
            </p>
            <Link
              href="/"
              className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted hover:text-kyzz-dark transition-colors"
            >
              Continuar comprando
            </Link>
          </div>
          <CartScrollable>
            <ProductsInCart />
          </CartScrollable>
        </div>

        {/* Resumen */}
        <div className="kyzz-panel sticky top-24">
          <h2 className={`${titleFont.className} text-xl font-normal text-kyzz-dark mb-6`}>
            Resumen
          </h2>
          <OrderSummary />
          <div className="mt-8">
            <Link href="/checkout/address" className="btn-primary w-full">
              Finalizar compra
            </Link>
          </div>
        </div>

      </div>

      {/* Recomendaciones — full width, debajo del carrito */}
      <CartRecommendations />
      <RecentlyViewed />

    </div>
  );
}
