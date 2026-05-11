export const revalidate = 0;

import Link from "next/link";
import { getPaginatedProductsWithImages } from "@/actions";
import { AdminSearchInput, DeleteProductButton, Pagination, ProductImage, ToggleFeaturedButton } from "@/components";
import { currencyFormat } from "@/utils";
import { titleFont } from "@/config/fonts";
import { IoAddOutline, IoPencilOutline, IoStorefrontOutline } from "react-icons/io5";

interface Props {
  searchParams: { page?: string; q?: string };
}

export default async function AdminProductsPage({ searchParams }: Props) {
  const page  = searchParams.page ? parseInt(searchParams.page) : 1;
  const query = searchParams.q ?? '';
  const { products, totalPages } = await getPaginatedProductsWithImages({ page, query });

  return (
    <div>
      {/* ── Cabecera ──────────────────────────────────── */}
      <div className="flex items-end justify-between mb-10">
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

      {/* ── Lista ─────────────────────────────────────── */}
      {products.length === 0 ? (
        <AdminEmpty label="productos" />
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
              className="grid grid-cols-[64px_1fr] md:grid-cols-[80px_1fr_120px_100px_80px_80px_40px_40px_40px] gap-3 items-center px-5 py-4 hover:bg-kyzz-tertiary/50 transition-colors group"
            >
              {/* Imagen */}
              <Link href={`/product/${product.slug}`} className="shrink-0">
                <ProductImage
                  src={product.ProductImage[0]?.url}
                  width={64}
                  height={64}
                  alt={product.title}
                  className="w-16 h-16 object-cover"
                />
              </Link>

              {/* Título */}
              <div className="min-w-0">
                <Link href={`/admin/product/${product.slug}`} className="text-sm text-kyzz-dark hover:text-kyzz-primary transition-colors line-clamp-2">
                  {product.title}
                </Link>
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

              {/* Destacado */}
              <ToggleFeaturedButton productId={product.id} isFeatured={product.isFeatured} />

              {/* Editar */}
              <Link
                href={`/admin/product/${product.slug}`}
                className="hidden md:flex items-center justify-center w-8 h-8 border border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Editar"
              >
                <IoPencilOutline size={13} />
              </Link>

              {/* Eliminar */}
              <DeleteProductButton productId={product.id} productTitle={product.title} />
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

const AdminEmpty = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center py-24 gap-4 text-center border border-kyzz-secondary">
    <IoStorefrontOutline className="w-8 h-8 text-kyzz-muted" />
    <p className="text-sm text-kyzz-muted">Sin {label} registrados</p>
  </div>
);
