export const revalidate = 60;

import { redirect } from 'next/navigation';
import { getFeaturedProductsPaginated } from '@/actions';
import { Pagination, ProductGrid } from '@/components';
import { titleFont } from '@/config/fonts';

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function ColeccionEspecialPage(props: Props) {
  const searchParams = await props.searchParams;
  const page = searchParams.page ? parseInt(searchParams.page) : 1;

  const { products, totalPages } = await getFeaturedProductsPaginated({ page });

  if (products.length === 0 && page > 1) redirect('/coleccion-especial');

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
          <>
            <ProductGrid products={products} />
            <div className="mt-10">
              <Pagination totalPages={totalPages} />
            </div>
          </>
        )}
      </section>
    </>
  );
}
