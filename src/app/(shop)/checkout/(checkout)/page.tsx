import Link from 'next/link';
import { titleFont } from '@/config/fonts';
import { ProductsInCart } from './ui/ProductsInCart';
import { PlaceOrder } from './ui/PlaceOrder';

export default function CheckoutPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16 mb-16 md:mb-24">

      <div className="mb-12">
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Confirmar pedido
        </h1>
        <div className="kyzz-divider-left" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-16 items-start">

        {/* Productos */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Artículos</p>
            <Link
              href="/cart"
              className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted hover:text-kyzz-dark transition-colors"
            >
              Editar carrito
            </Link>
          </div>
          <ProductsInCart />
        </div>

        {/* Resumen + CTA */}
        <PlaceOrder />
      </div>
    </div>
  );
}
