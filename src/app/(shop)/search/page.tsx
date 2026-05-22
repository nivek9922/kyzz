import { searchProducts } from '@/actions';
import { ProductGrid, ViewItemListTracker } from '@/components';
import { titleFont } from '@/config/fonts';
import { SearchBar } from './ui/SearchBar';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage(props: Props) {
  const searchParams = await props.searchParams;
  const query = searchParams.q?.trim() ?? '';
  const products = query.length >= 2 ? await searchProducts(query) : [];

  return (
    <main className="max-w-7xl mx-auto px-6 py-16">

      {/* Cabecera */}
      <div className="mb-10">
        <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-3">
          Buscar
        </p>
        <h1 className={`${titleFont.className} text-4xl font-normal text-kyzz-dark`}>
          {query ? `"${query}"` : 'Buscar productos'}
        </h1>
        <div className="w-8 h-px bg-kyzz-secondary mt-4" />
      </div>

      {/* Input de búsqueda */}
      <div className="max-w-md mb-12">
        <SearchBar initialValue={query} />
      </div>

      {/* Resultados */}
      {query.length < 2 ? (
        <p className="text-sm text-kyzz-muted">Escribe al menos 2 caracteres para buscar.</p>
      ) : products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-kyzz-muted mb-2">Sin resultados para &ldquo;{query}&rdquo;</p>
          <p className="text-xs text-kyzz-muted/70">Intenta con otro término: jeans, blusa, chaqueta...</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-kyzz-muted mb-8 tracking-wide">
            {products.length} resultado{products.length !== 1 ? 's' : ''}
          </p>
          <ViewItemListTracker listName="search_results" products={products} />
          <ProductGrid products={products} listName="search_results" />
        </>
      )}

    </main>
  );
}
