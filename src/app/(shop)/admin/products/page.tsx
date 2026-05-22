export const revalidate = 0;

import Link from "next/link";
import { getPaginatedProductsWithImages } from "@/actions";
import {
  AdminSearchInput,
  ArchivedProductActions,
  DeleteProductButton,
  Pagination,
  ProductImage,
  ToggleFeaturedButton,
} from "@/components";
import { currencyFormat } from "@/utils";
import { titleFont } from "@/config/fonts";
import { IoAddOutline, IoPencilOutline, IoStorefrontOutline } from "react-icons/io5";

interface Props {
  searchParams: Promise<{ page?: string; q?: string; archived?: string }>;
}

export default async function AdminProductsPage(props: Props) {
  const searchParams = await props.searchParams;
  const page         = searchParams.page ? parseInt(searchParams.page) : 1;
  const query        = searchParams.q ?? '';
  const showArchived = searchParams.archived === '1';

  const { products, totalPages, variantColors } = await getPaginatedProductsWithImages({
    page,
    query,
    showArchived,
  });

  return (
    <div>
      {/* ── Cabecera ─────────────────────────────────── */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Admin</p>
          <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
            Productos
          </h1>
          <div className="w-6 h-px bg-kyzz-secondary mt-3" />
        </div>
        <div className="flex items-center gap-3">
          <AdminSearchInput defaultValue={query || undefined} />
          <Link href="/admin/product/new" className="btn-primary flex items-center gap-2">
            <IoAddOutline size={14} />
            Nuevo
          </Link>
        </div>
      </div>

      {/* ── Tabs activos / archivados ─────────────────── */}
      <div className="flex gap-4 mb-8 border-b border-kyzz-secondary">
        <Link
          href="/admin/products"
          className={`pb-3 text-[11px] tracking-widest uppercase transition-colors ${
            !showArchived
              ? 'text-kyzz-dark border-b-2 border-kyzz-dark -mb-px'
              : 'text-kyzz-muted hover:text-kyzz-dark'
          }`}
        >
          Activos
        </Link>
        <Link
          href="/admin/products?archived=1"
          className={`pb-3 text-[11px] tracking-widest uppercase transition-colors ${
            showArchived
              ? 'text-kyzz-dark border-b-2 border-kyzz-dark -mb-px'
              : 'text-kyzz-muted hover:text-kyzz-dark'
          }`}
        >
          Archivados
        </Link>
      </div>

      {showArchived && (
        <p className="text-xs text-kyzz-muted mb-6">
          Los productos archivados no aparecen en la tienda. Puedes restaurarlos en cualquier momento o eliminarlos definitivamente si nunca tuvieron pedidos.
        </p>
      )}

      {/* ── Lista ───────────────────────────────────────── */}
      {products.length === 0 ? (
        <AdminEmpty showArchived={showArchived} />
      ) : (
        <div className="flex flex-col divide-y divide-kyzz-secondary border border-kyzz-secondary">

          {/* Header */}
          <div className="hidden md:grid grid-cols-[80px_1fr_120px_100px_80px_80px_40px_40px_40px] gap-3 px-5 py-3 bg-kyzz-tertiary">
            {['', 'Producto', 'Precio', 'Categoría', 'Stock', 'Tallas', '', '', ''].map((h, i) => (
              <p key={i} className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted">{h}</p>
            ))}
          </div>

          {products.map((product) => (
            <div
              key={product.id}
              className={`grid grid-cols-[64px_1fr] md:grid-cols-[80px_1fr_120px_100px_80px_80px_40px_40px_40px] gap-3 items-center px-5 py-4 transition-colors group ${
                showArchived ? 'opacity-60 hover:opacity-100' : 'hover:bg-kyzz-tertiary/50'
              }`}
            >
              {/* Imagen */}
              <Link href={`/admin/product/${product.slug}`} className="shrink-0">
                <ProductImage
                  src={product.ProductImage[0]?.url ?? variantColors[product.id]?.[0]?.image ?? undefined}
                  width={64}
                  height={64}
                  alt={product.title}
                  className="w-16 h-16 object-cover"
                />
              </Link>

              {/* Título */}
              <div className="min-w-0">
                <Link
                  href={`/admin/product/${product.slug}`}
                  className="text-sm text-kyzz-dark hover:text-kyzz-primary transition-colors line-clamp-2"
                >
                  {product.title}
                </Link>
                {showArchived && (
                  <span className="text-[9px] tracking-widest uppercase text-amber-500 mt-0.5 block">
                    Archivado
                  </span>
                )}
                <p className="text-[10px] text-kyzz-muted mt-0.5 md:hidden">
                  {currencyFormat(product.price)} · Stock: {product.inStock}
                </p>
              </div>

              {/* Precio */}
              <p className="hidden md:block text-sm text-kyzz-dark font-medium">
                {currencyFormat(product.price)}
              </p>

              {/* Categoría */}
              <p className="hidden md:block text-xs text-kyzz-muted capitalize">
                {product.category?.name ?? '—'}
              </p>

              {/* Stock */}
              <p className={`hidden md:block text-xs font-medium ${product.inStock < 5 ? 'text-amber-600' : 'text-kyzz-dark'}`}>
                {product.inStock} uds.
              </p>

              {/* Tallas */}
              <p className="hidden md:block text-xs text-kyzz-muted truncate">
                {product.sizes.join(', ')}
              </p>

              {/* Destacado — siempre */}
              <ToggleFeaturedButton productId={product.id} isFeatured={product.isFeatured} />

              {/* Acciones: difieren según vista */}
              {showArchived ? (
                <ArchivedProductActions productId={product.id} productTitle={product.title} />
              ) : (
                <>
                  {/* Editar */}
                  <Link
                    href={`/admin/product/${product.slug}`}
                    className="hidden md:flex items-center justify-center w-8 h-8 border border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Editar"
                  >
                    <IoPencilOutline size={13} />
                  </Link>

                  {/* Archivar (reemplaza al eliminar) */}
                  <DeleteProductButton productId={product.id} productTitle={product.title} />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}

const AdminEmpty = ({ showArchived }: { showArchived: boolean }) => (
  <div className="flex flex-col items-center py-24 gap-4 text-center border border-kyzz-secondary">
    <IoStorefrontOutline className="w-8 h-8 text-kyzz-muted" />
    <p className="text-sm text-kyzz-muted">
      {showArchived ? 'No hay productos archivados' : 'Sin productos registrados'}
    </p>
    {showArchived && (
      <p className="text-xs text-kyzz-muted max-w-xs">
        Cuando archivas un producto desde la vista Activos aparece aquí, sin afectar el historial de pedidos.
      </p>
    )}
  </div>
);
