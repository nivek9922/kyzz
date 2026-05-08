export const revalidate = 60;

import { getPaginatedProductsWithImages, getCategories } from '@/actions';
import { Pagination, ProductGrid } from '@/components';
import { titleFont } from '@/config/fonts';
import { notFound } from 'next/navigation';

interface Props {
  params: { slug: string };
  searchParams: { page?: string };
}

const categoryLabels: Record<string, string> = {
  jeans:      'Jeans',
  blusas:     'Blusas',
  enterizos:  'Enterizos',
  chaquetas:  'Chaquetas',
};

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = params;
  const page = searchParams.page ? parseInt(searchParams.page) : 1;

  // Validar que la categoría existe
  const categories = await getCategories();
  const category = categories.find((c) => c.name.toLowerCase() === slug.toLowerCase());

  if (!category) notFound();

  const { products, totalPages } = await getPaginatedProductsWithImages({
    page,
    categoryId: category.id,
  });

  const label = categoryLabels[slug.toLowerCase()] ?? slug;

  return (
    <>
      {/* Cabecera */}
      <section className="border-b border-kyzz-secondary">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <p className="text-[11px] tracking-[0.25em] uppercase text-kyzz-muted mb-3">
            Categoría
          </p>
          <h1 className={`${titleFont.className} text-4xl font-normal text-kyzz-dark`}>
            {label}
          </h1>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        {products.length === 0 ? (
          <p className="text-sm text-kyzz-muted py-20 text-center">
            No hay productos en esta categoría aún.
          </p>
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
