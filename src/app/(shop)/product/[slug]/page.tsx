export const revalidate = 604800; // 7 días

import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getProductVariants } from "@/actions";
import { getProductColors as fetchProductColors } from "@/actions/product/manage-product-color";
import { ProductDetailClient } from './ui/ProductDetailClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: Props, _parent: ResolvingMetadata): Promise<Metadata> {
  const params  = await props.params;
  const product = await getProductBySlug(params.slug);

  const rawImage = product?.images[0];
  const ogImage  = rawImage?.startsWith('http') ? rawImage : rawImage ? `/products/${rawImage}` : undefined;

  return {
    title:       product?.title       ?? "Producto no encontrado",
    description: product?.description ?? "",
    openGraph: {
      title:       product?.title ? `${product.title} | KYZZ` : "Producto no encontrado",
      description: product?.description ?? "",
      images:      ogImage ? [ogImage] : [],
      type:        'website',
    },
  };
}

export default async function ProductBySlugPage(props: Props) {
  const params  = await props.params;
  const product = await getProductBySlug(params.slug);

  if (!product) notFound();

  const [productColors, variants] = await Promise.all([
    fetchProductColors(product.id),
    getProductVariants(product.id),
  ]);

  const colors = productColors.map((pc) => ({
    id:             pc.id,
    paletteColorId: pc.paletteColorId,
    paletteColor:   { id: pc.paletteColor.id, name: pc.paletteColor.name, hex: pc.paletteColor.hex },
    images:         pc.images.map((i) => ({ id: i.id, url: i.url })),
  }));

  const variantList = variants.map((v) => ({
    id:      v.id,
    colorId: v.colorId,
    size:    v.size,
    stock:   v.stock,
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 mb-16">
      <ProductDetailClient product={product} colors={colors} variants={variantList} />
    </div>
  );
}
