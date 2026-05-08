export const revalidate = 60;

import { getPaginatedProductsWithImages } from '@/actions';
import { Pagination, ProductGrid } from '@/components';
import { titleFont } from '@/config/fonts';
import { Gender } from '@prisma/client';
import { redirect } from 'next/navigation';

interface Props {
  params: { gender: string };
  searchParams: { page?: string };
}

// Solo se permiten rutas de mujer o unisex
const ALLOWED_GENDERS = ['women', 'unisex'];

const labels: Record<string, { heading: string; sub: string }> = {
  women:  { heading: 'Para ellas',   sub: 'Colección femenina' },
  unisex: { heading: 'Para todos',   sub: 'Colección unisex'   },
};

export default async function GenderByPage({ params, searchParams }: Props) {
  const { gender } = params;
  const page = searchParams.page ? parseInt(searchParams.page) : 1;

  // Redirigir categorías masculinas o infantiles a la colección de mujer
  if (!ALLOWED_GENDERS.includes(gender)) {
    redirect('/gender/women');
  }

  const { products, totalPages } = await getPaginatedProductsWithImages({
    page,
    gender: gender as Gender,
  });

  if (products.length === 0) redirect(`/gender/${gender}`);

  const label = labels[gender] ?? { heading: gender, sub: 'Colección' };

  return (
    <>
      {/* Cabecera de categoría */}
      <section className="border-b border-kyzz-secondary">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <p className="text-[11px] tracking-[0.25em] uppercase text-kyzz-muted mb-3">
            {label.sub}
          </p>
          <h1 className={`${titleFont.className} text-4xl font-normal text-kyzz-dark`}>
            {label.heading}
          </h1>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <ProductGrid products={products} />
        <Pagination totalPages={totalPages} />
      </section>
    </>
  );
}