// PDP cacheada 1h por slug. Las mutaciones admin usan updateTag para invalidación inmediata.
import { Suspense } from "react";
import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
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

/**
 * Datos del shell de la PDP, cacheados por slug. Incluye el resumen de reseñas
 * (promedio + conteo) que el shell necesita para las estrellas — barato y se
 * invalida con updateTag('product:{slug}') al crear/borrar reseñas.
 * El listado completo de reseñas se carga aparte (streaming, ver ReviewsSection).
 */
function getProductPageData(slug: string) {
  return unstable_cache(
    async () => {
      const product = await getProductBySlug(slug);
      if (!product) return null;
      const [productColors, variants, reviewAgg] = await Promise.all([
        fetchProductColors(product.id),
        getProductVariants(product.id),
        prisma.review.aggregate({ where: { productId: product.id }, _avg: { rating: true }, _count: true }),
      ]);
      return {
        product,
        productColors,
        variants,
        reviewSummary: { average: reviewAgg._avg.rating ?? 0, count: reviewAgg._count },
      };
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

  const { product, productColors, variants, reviewSummary } = data;

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
        {/* Shell: imagen, precio, tallas, add-to-cart — renderiza de inmediato desde caché */}
        <ProductDetailClient
          product={product}
          colors={colors}
          variants={variantList}
          reviewSummary={reviewSummary}
        />
        {/* Reseñas: se streamean aparte (auth + listado completo no bloquean el shell) */}
        <div id="reseñas">
          <Suspense fallback={<ReviewsSkeleton />}>
            <ReviewsSection productId={product.id} />
          </Suspense>
        </div>
      </div>
      <HomeRecentlyViewed />
    </>
  );
}

/** Sección de reseñas — dinámica (auth + listado). Se streamea bajo un Suspense. */
async function ReviewsSection({ productId }: { productId: string }) {
  const [session, reviewData] = await Promise.all([
    auth(),
    getProductReviews(productId),
  ]);

  return (
    <ProductReviews
      productId={productId}
      reviews={reviewData.reviews}
      summary={reviewData.summary}
      userReview={reviewData.userReview}
      hasPurchased={reviewData.hasPurchased}
      isLoggedIn={!!session?.user?.id}
    />
  );
}

/** Placeholder mientras las reseñas cargan en streaming. */
function ReviewsSkeleton() {
  return (
    <div className="mt-16 animate-pulse space-y-4" aria-hidden>
      <div className="h-5 w-44 bg-kyzz-tertiary rounded" />
      <div className="h-px w-full bg-kyzz-secondary" />
      <div className="h-20 bg-kyzz-tertiary rounded" />
      <div className="h-20 bg-kyzz-tertiary rounded" />
    </div>
  );
}
