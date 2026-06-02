// PDP cacheada 1h por slug. Las mutaciones admin usan updateTag para invalidación inmediata.
import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { getProductBySlug, getProductVariants } from "@/actions";
import { getProductColors as fetchProductColors } from "@/actions/product/manage-product-color";
import { getProductReviews } from "@/actions/review/get-product-reviews";
import { auth } from '@/auth';
import { ProductDetailClient } from './ui/ProductDetailClient';
import { ProductReviews } from './ui/ProductReviews';
import { HomeRecentlyViewed } from '../../ui/HomeRecentlyViewed';

interface Props {
  params: Promise<{ slug: string }>;
}

/** Todos los datos de la PDP en un solo bloque cacheado por slug. */
function getProductPageData(slug: string) {
  return unstable_cache(
    async () => {
      const product = await getProductBySlug(slug);
      if (!product) return null;
      const [productColors, variants] = await Promise.all([
        fetchProductColors(product.id),
        getProductVariants(product.id),
      ]);
      return { product, productColors, variants };
    },
    [`product-page:${slug}`],
    { tags: [`product:${slug}`], revalidate: 3600 },
  )();
}

export async function generateMetadata(props: Props, _parent: ResolvingMetadata): Promise<Metadata> {
  const params = await props.params;
  const data   = await getProductPageData(params.slug);
  const product = data?.product;

  // Fallback: imagen legacy → imagen del primer color (productos solo-variante no tienen ProductImage)
  const rawImage = product?.images[0] ?? data?.productColors?.[0]?.images?.[0]?.url;
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
  const params = await props.params;
  const data   = await getProductPageData(params.slug);

  if (!data) notFound();

  const { product, productColors, variants } = data;
  const [session, reviewData] = await Promise.all([
    auth(),
    getProductReviews(product.id),
  ]);

  const colors = productColors.map((pc) => ({
    id:             pc.id,
    paletteColorId: pc.paletteColorId,
    paletteColor:   { id: pc.paletteColor.id, name: pc.paletteColor.name, hex: pc.paletteColor.hex },
    images:         pc.images.map((i) => ({ id: i.id, url: i.url })),
  }));

  const variantList = variants.map((v) => ({
    id:       v.id,
    colorId:  v.colorId,
    size:     v.size,
    stock:    v.stock,
    reserved: v.reserved,
  }));

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-8 mb-16">
        <ProductDetailClient
          product={product}
          colors={colors}
          variants={variantList}
          reviewSummary={{ average: reviewData.summary.average, count: reviewData.summary.count }}
        />
        <div id="reseñas">
          <ProductReviews
            productId={product.id}
            reviews={reviewData.reviews}
            summary={reviewData.summary}
            userReview={reviewData.userReview}
            hasPurchased={reviewData.hasPurchased}
            isLoggedIn={!!session?.user?.id}
          />
        </div>
      </div>
      <HomeRecentlyViewed />
    </>
  );
}
