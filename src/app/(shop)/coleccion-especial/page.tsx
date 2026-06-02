export const revalidate = 60;

import type { Metadata } from 'next';
import { getFeaturedProductsPaginated } from '@/actions';

export const metadata: Metadata = {
  title: 'Colección Especial',
  description:
    'Piezas seleccionadas con intención. Lo mejor de KYZZ, curado para ti.',
  alternates: { canonical: '/coleccion-especial' },
  openGraph: {
    title:       'Colección Especial | KYZZ',
    description: 'Piezas seleccionadas con intención. Lo mejor de KYZZ, curado para ti.',
    type:        'website',
  },
};
import { InfiniteProductGrid } from '@/components';
import { titleFont } from '@/config/fonts';

export default async function ColeccionEspecialPage() {
  const { products, totalPages, variantColors } = await getFeaturedProductsPaginated({ page: 1 });

  return (
    <>
      {/* ── Cabecera ─────────────────────────────────────────── */}
      <section className="border-b border-kyzz-secondary bg-kyzz-tertiary">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <p className="text-[11px] tracking-[0.35em] uppercase text-kyzz-muted mb-4">
            Piezas seleccionadas
          </p>
          <h1 className={`${titleFont.className} text-5xl font-normal text-kyzz-dark mb-4`}>
            Colección Especial
          </h1>
          <p className="text-sm text-kyzz-muted max-w-md mx-auto leading-relaxed">
            Cada pieza aquí fue elegida con intención. Lo mejor de KYZZ, curado para ti.
          </p>
          <div className="kyzz-divider mt-8" />
        </div>
      </section>

      {/* ── Grid ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        {products.length === 0 ? (
          <div className="py-32 text-center">
            <p className="text-sm text-kyzz-muted">
              No hay piezas destacadas en este momento.
            </p>
          </div>
        ) : (
          <InfiniteProductGrid
            initialProducts={products}
            initialVariantColors={variantColors}
            totalPages={totalPages}
            isFeatured={true}
          />
        )}
      </section>
    </>
  );
}
