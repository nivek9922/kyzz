export const revalidate = 60;

import Link from 'next/link';
import Image from 'next/image';
import { getFeaturedProducts, getSiteConfig, getCategories } from '@/actions';
import { HomeRecentlyViewed } from './ui/HomeRecentlyViewed';
import { HomeCategorySection } from './ui/HomeCategorySection';
import { ProductGridItem, ViewItemListTracker } from '@/components';

export default async function Home() {
  const [featuredData, config, categories] = await Promise.all([
    getFeaturedProducts(),
    getSiteConfig(),
    getCategories(),
  ]);
  const { products: featuredProducts, variantColors: featuredColors } = featuredData;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative w-full h-[82vh] min-h-[520px] bg-kyzz-secondary overflow-hidden flex items-center justify-center">

        {/* Imagen de fondo (si está configurada) */}
        {config.heroImageUrl && (
          <div className="absolute inset-0 hero-bg-img">
            <Image
              src={config.heroImageUrl}
              alt="Hero KYZZ"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-kyzz-dark/30" />
          </div>
        )}

        {/* Marca de agua K (solo sin imagen) */}
        {!config.heroImageUrl && (
          <div className="hero-k absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none select-none">
            <span className="font-serif text-[32vw] text-kyzz-dark leading-none">K</span>
          </div>
        )}

        {/* Contenido */}
        <div className={`relative z-10 text-center px-6 ${config.heroImageUrl ? 'text-white' : ''}`}>
          <p className={`hero-label text-xs tracking-[0.4em] uppercase mb-4 ${config.heroImageUrl ? 'text-white/70' : 'text-kyzz-muted'}`}>
            {config.heroSubtitle}
          </p>
          <h1 className={`hero-title font-serif text-5xl md:text-7xl leading-tight mb-6 ${config.heroImageUrl ? 'text-white' : 'text-kyzz-dark'}`}>
            {config.heroTitle.includes('\\n')
              ? config.heroTitle.split('\\n').map((line: string, i: number) => (
                  <span key={i}>{line}{i < config.heroTitle.split('\\n').length - 1 && <br />}</span>
                ))
              : config.heroTitle}
          </h1>
          <div className="hero-cta">
            <Link
              href="/products"
              className={config.heroImageUrl ? 'btn-primary-outline border-white text-white hover:bg-white hover:text-kyzz-dark inline-block mt-2' : 'btn-primary inline-block mt-2'}
            >
              {config.heroCta}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Categorías ───────────────────────────────────────── */}
      <HomeCategorySection categories={categories} />

      {/* ── Colección Especial ────────────────────────────────── */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">
                Piezas seleccionadas
              </p>
              <h2 className="font-serif text-3xl text-kyzz-dark">Colección Especial</h2>
              <div className="kyzz-divider-left mt-4" />
            </div>
            <Link
              href="/coleccion-especial"
              className="text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
            >
              Ver todas
            </Link>
          </div>
          <ViewItemListTracker listName="coleccion_especial" products={featuredProducts} />
          {/* Mobile: scroll horizontal — 2 cards visibles + ~25% de la 3ra asoma */}
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 -mr-6 md:mr-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-x-visible">
            {featuredProducts.map((product) => (
              <div key={product.slug} className="shrink-0 w-[43%] md:w-auto">
                <ProductGridItem
                  product={product}
                  colorVariants={featuredColors[product.id]}
                  listName="coleccion_especial"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Frase de marca ───────────────────────────────────── */}
      <section className="bg-kyzz-tertiary py-24 text-center px-6">
        <blockquote className="font-serif text-2xl md:text-4xl text-kyzz-dark max-w-2xl mx-auto leading-snug italic">
          &ldquo;Un beso a tu estilo propio.<br />Kyzz nace de la unión y el detalle.&rdquo;
        </blockquote>
        <div className="kyzz-divider mt-8" />
        <Link
          href="/products"
          className="mt-8 inline-block text-[11px] tracking-[0.25em] uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
        >
          Explorar todas las piezas →
        </Link>
      </section>

      {/* ── Viste recientemente ───────────────────────────────── */}
      <HomeRecentlyViewed />
    </>
  );
}
