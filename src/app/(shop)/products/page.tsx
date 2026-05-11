export const revalidate = 60;

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Size } from '@prisma/client';
import { getPaginatedProductsWithImages, getCategories } from '@/actions';
import { Pagination, ProductGrid, ProductFilters } from '@/components';
import { titleFont } from '@/config/fonts';
import type { SortOption } from '@/actions/product/product-pagination';

interface Props {
  searchParams: {
    page?:     string;
    category?: string;
    sizes?:    string;
    min?:      string;
    max?:      string;
    sort?:     string;
  };
}

export default async function ProductsPage({ searchParams }: Props) {
  const page        = searchParams.page ? parseInt(searchParams.page) : 1;
  const catSlug     = searchParams.category?.toLowerCase();
  const sizesParam  = searchParams.sizes?.split(',').filter(Boolean) as Size[] | undefined;
  const minPrice    = searchParams.min  ? parseFloat(searchParams.min)  : undefined;
  const maxPrice    = searchParams.max  ? parseFloat(searchParams.max)  : undefined;
  const sortBy      = (searchParams.sort ?? 'newest') as SortOption;

  const allCategories = await getCategories();

  let categoryId: string | undefined;
  let activeCategory: { name: string; slug: string } | undefined;

  if (catSlug) {
    const match = allCategories.find((c) => c.slug === catSlug);
    if (!match) redirect('/products');
    categoryId     = match.id;
    activeCategory = match;
  }

  const { products, totalPages } = await getPaginatedProductsWithImages({
    page,
    categoryId,
    sizes:    sizesParam,
    minPrice,
    maxPrice,
    sortBy,
  });

  if (products.length === 0 && page > 1) {
    redirect(catSlug ? `/products?category=${catSlug}` : '/products');
  }

  const heading = activeCategory?.name ?? 'Colección';
  const sub     = catSlug ? 'Categoría' : 'Todas las piezas';

  return (
    <>
      {/* ── Cabecera ─────────────────────────────────────────── */}
      <section className="border-b border-kyzz-secondary">
        <div className="max-w-7xl mx-auto px-6 py-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[0.25em] uppercase text-kyzz-muted mb-3">{sub}</p>
            <h1 className={`${titleFont.className} text-4xl font-normal text-kyzz-dark`}>{heading}</h1>
          </div>
          <ProductFilters categories={allCategories} />
        </div>
      </section>

      {/* ── Tabs de categoría ────────────────────────────────── */}
      <section className="border-b border-kyzz-secondary bg-kyzz-neutral sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
            <FilterTab href="/products" label="Todas" active={!catSlug} />
            {allCategories.map((cat) => (
              <FilterTab
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                label={cat.name}
                active={catSlug === cat.slug}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Grid ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        {products.length === 0 ? (
          <div className="py-32 text-center">
            <p className="text-sm text-kyzz-muted">No hay productos con esos filtros.</p>
            <Link href="/products" className="btn-primary inline-block mt-6">Limpiar filtros</Link>
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

interface FilterTabProps { href: string; label: string; active: boolean; }

function FilterTab({ href, label, active }: FilterTabProps) {
  return (
    <Link
      href={href}
      className={`shrink-0 px-5 py-4 text-[11px] tracking-[0.2em] uppercase transition-colors border-b-2 ${
        active
          ? 'text-kyzz-dark border-kyzz-primary'
          : 'text-kyzz-muted border-transparent hover:text-kyzz-dark hover:border-kyzz-secondary'
      }`}
    >
      {label}
    </Link>
  );
}
