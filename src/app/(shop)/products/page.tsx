export const revalidate = 60;

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPaginatedProductsWithImages, getCategories } from '@/actions';
import { Pagination, ProductGrid } from '@/components';
import { titleFont } from '@/config/fonts';

interface Props {
  searchParams: {
    page?: string;
    category?: string;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  jeans:     'Jeans',
  blusas:    'Blusas',
  enterizos: 'Enterizos',
  chaquetas: 'Chaquetas',
};

export default async function ProductsPage({ searchParams }: Props) {
  const page     = searchParams.page     ? parseInt(searchParams.page) : 1;
  const catSlug  = searchParams.category?.toLowerCase();

  // Resuelve categoryId si hay filtro activo
  let categoryId: string | undefined;
  if (catSlug) {
    const categories = await getCategories();
    const match = categories.find((c) => c.name.toLowerCase() === catSlug);
    if (!match) redirect('/products');
    categoryId = match.id;
  }

  const { products, totalPages } = await getPaginatedProductsWithImages({ page, categoryId });

  if (products.length === 0 && page > 1) redirect(catSlug ? `/products?category=${catSlug}` : '/products');

  const heading = catSlug ? (CATEGORY_LABELS[catSlug] ?? catSlug) : 'Colección';
  const sub     = catSlug ? 'Categoría' : 'Todas las piezas';

  return (
    <>
      {/* ── Cabecera ─────────────────────────────────────────── */}
      <section className="border-b border-kyzz-secondary">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <p className="text-[11px] tracking-[0.25em] uppercase text-kyzz-muted mb-3">
            {sub}
          </p>
          <h1 className={`${titleFont.className} text-4xl font-normal text-kyzz-dark`}>
            {heading}
          </h1>
        </div>
      </section>

      {/* ── Filtros de categoría ──────────────────────────────── */}
      <section className="border-b border-kyzz-secondary bg-kyzz-neutral sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
            <FilterTab href="/products" label="Todas" active={!catSlug} />
            {Object.entries(CATEGORY_LABELS).map(([slug, label]) => (
              <FilterTab
                key={slug}
                href={`/products?category=${slug}`}
                label={label}
                active={catSlug === slug}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Grid ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        {products.length === 0 ? (
          <div className="py-32 text-center">
            <p className="text-sm text-kyzz-muted">
              No hay productos en esta categoría aún.
            </p>
            <Link href="/products" className="btn-primary inline-block mt-6">
              Ver toda la colección
            </Link>
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

// ── Componente de tab ─────────────────────────────────────────
interface FilterTabProps {
  href: string;
  label: string;
  active: boolean;
}

function FilterTab({ href, label, active }: FilterTabProps) {
  return (
    <Link
      href={href}
      className={`
        shrink-0 px-5 py-4 text-[11px] tracking-[0.2em] uppercase transition-colors border-b-2
        ${active
          ? 'text-kyzz-dark border-kyzz-primary'
          : 'text-kyzz-muted border-transparent hover:text-kyzz-dark hover:border-kyzz-secondary'
        }
      `}
    >
      {label}
    </Link>
  );
}
