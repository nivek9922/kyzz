import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Size } from '@prisma/client';
import { getPaginatedProductsWithImages, getCategories } from '@/actions';
import { getProductColors } from '@/actions/product/get-product-colors';
import { InfiniteProductGrid, ProductFilters } from '@/components';
import { titleFont } from '@/config/fonts';
import type { SortOption } from '@/actions/product/product-pagination';

interface Props {
  searchParams: Promise<{
    category?: string;
    sizes?:    string;
    min?:      string;
    max?:      string;
    sort?:     string;
    color?:    string | string[];
  }>;
}

const CATEGORY_LABEL: Record<string, string> = {
  jeans:     'Jeans',
  blusas:    'Blusas',
  enterizos: 'Enterizos',
  chaquetas: 'Chaquetas',
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { category } = await props.searchParams;
  const label = category ? CATEGORY_LABEL[category.toLowerCase()] : undefined;

  const title = label ? `${label} — Catálogo` : 'Catálogo';
  const description = label
    ? `Descubre nuestra colección de ${label.toLowerCase()}. Calidad premium, diseño atemporal. KYZZ.`
    : 'Explora todo el catálogo KYZZ: jeans, blusas, enterizos y chaquetas. Calidad premium, diseño atemporal.';

  return {
    title,
    description,
    // Canónica sin query para evitar duplicados indexados por filtro
    alternates: { canonical: '/products' },
    openGraph: { title: `${title} | KYZZ`, description, type: 'website' },
  };
}

export default async function ProductsPage(props: Props) {
  const searchParams = await props.searchParams;
  const catSlug     = searchParams.category?.toLowerCase();
  const sizesParam  = searchParams.sizes?.split(',').filter(Boolean) as Size[] | undefined;
  const minPrice    = searchParams.min   ? parseFloat(searchParams.min)  : undefined;
  const maxPrice    = searchParams.max   ? parseFloat(searchParams.max)  : undefined;
  const sortBy      = (searchParams.sort ?? 'newest') as SortOption;
  const colorNames  = searchParams.color
    ? (Array.isArray(searchParams.color) ? searchParams.color : [searchParams.color]).filter(Boolean)
    : [];

  const [allCategories, availableColors] = await Promise.all([
    getCategories(),
    getProductColors(),
  ]);

  let categoryId: string | undefined;
  let activeCategory: { name: string; slug: string } | undefined;

  if (catSlug) {
    const match = allCategories.find((c) => c.slug === catSlug);
    if (!match) redirect('/products');
    categoryId     = match.id;
    activeCategory = match;
  }

  const { products, totalPages, variantColors } = await getPaginatedProductsWithImages({
    page:       1,
    categoryId,
    sizes:      sizesParam,
    minPrice,
    maxPrice,
    sortBy,
    colorNames: colorNames.length > 0 ? colorNames : undefined,
  });

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
          <ProductFilters categories={allCategories} colors={availableColors} />
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
          <InfiniteProductGrid
            initialProducts={products}
            initialVariantColors={variantColors}
            totalPages={totalPages}
            categoryId={categoryId}
            sizes={sizesParam}
            minPrice={minPrice}
            maxPrice={maxPrice}
            sortBy={sortBy}
            colorNames={colorNames.length > 0 ? colorNames : undefined}
          />
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
