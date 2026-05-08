export const revalidate = 604800; // 7 días
import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

import {
  ProductMobileSlideshow,
  ProductSlideshow,
  QuantitySelector,
  SizeSelector,
  StockLabel,
} from "@/components";
import { getProductBySlug } from "@/actions";
import { AddToCart } from './ui/AddToCart';

interface Props {
  params: {
    slug: string;
  };
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);

  return {
    title: product?.title ?? "Producto no encontrado",
    description: product?.description ?? "",
    openGraph: {
      title: product?.title ?? "Producto no encontrado",
      description: product?.description ?? "",
      images: [`/products/${product?.images[0]}`],
    },
  };
}

export default async function ProductBySlugPage({ params }: Props) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 mb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

        {/* ── Imágenes ─────────────────────────────────────────── */}
        <div>
          <ProductMobileSlideshow
            title={product.title}
            images={product.images}
            className="block md:hidden"
          />
          <ProductSlideshow
            title={product.title}
            images={product.images}
            className="hidden md:block"
          />
        </div>

        {/* ── Información del producto ──────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Stock */}
          <StockLabel slug={product.slug} />

          {/* Título y precio */}
          <div>
            <h1 className="font-serif text-3xl text-kyzz-dark leading-snug">
              {product.title}
            </h1>
            <p className="mt-3 text-xl text-kyzz-primary font-light">
              ${product.price.toFixed(2)}
            </p>
          </div>

          {/* Separador */}
          <div className="kyzz-divider" />

          {/* Selector de talla + cantidad + CTA */}
          <AddToCart product={product} />

          {/* Separador */}
          <div className="kyzz-divider" />

          {/* Descripción */}
          <div>
            <h3 className="text-xs tracking-widest uppercase text-kyzz-muted mb-3">
              Descripción
            </h3>
            <p className="text-sm text-kyzz-dark leading-relaxed">
              {product.description}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

