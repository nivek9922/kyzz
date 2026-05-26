export const revalidate = 60;

import Link from 'next/link';
import Image from 'next/image';
import { getFeaturedProducts, getSiteConfig, getCategories, getNewArrivals } from '@/actions';
import { HomeRecentlyViewed } from './ui/HomeRecentlyViewed';
import { HomeCategorySection } from './ui/HomeCategorySection';
import { HomeNewArrivalsSection } from './ui/HomeNewArrivalsSection';
import { HomeFeaturedSection } from './ui/HomeFeaturedSection';
import { HomeEditorialSplit } from './ui/HomeEditorialSplit';
import { HeroVideo } from './ui/HeroVideo';

export default async function Home() {
  const [featuredData, config, categories, newArrivalsData] = await Promise.all([
    getFeaturedProducts(),
    getSiteConfig(),
    getCategories(),
    getNewArrivals(8),
  ]);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative w-full h-[82vh] min-h-[520px] bg-kyzz-secondary overflow-hidden flex items-center justify-center">

        {/* Fondo: video > imagen > marca K */}
        {config.heroVideoUrl && config.heroPosterUrl ? (
          <>
            <HeroVideo videoUrl={config.heroVideoUrl} posterUrl={config.heroPosterUrl} />
            <div className="absolute inset-0 bg-kyzz-dark/30" />
          </>
        ) : config.heroImageUrl ? (
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
        ) : (
          <div className="hero-k absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none select-none">
            <span className="font-serif text-[32vw] text-kyzz-dark leading-none">K</span>
          </div>
        )}

        <div className={`relative z-10 text-center px-6 ${(config.heroVideoUrl || config.heroImageUrl) ? 'text-white' : ''}`}>
          <p className={`hero-label text-xs tracking-[0.4em] uppercase mb-4 ${(config.heroVideoUrl || config.heroImageUrl) ? 'text-white/70' : 'text-kyzz-muted'}`}>
            {config.heroSubtitle}
          </p>
          <h1 className={`hero-title font-serif text-5xl md:text-7xl leading-tight mb-6 ${(config.heroVideoUrl || config.heroImageUrl) ? 'text-white' : 'text-kyzz-dark'}`}>
            {config.heroTitle.includes('\\n')
              ? config.heroTitle.split('\\n').map((line: string, i: number) => (
                  <span key={i}>{line}{i < config.heroTitle.split('\\n').length - 1 && <br />}</span>
                ))
              : config.heroTitle}
          </h1>
          <div className="hero-cta">
            <Link
              href="/products"
              className={(config.heroVideoUrl || config.heroImageUrl) ? 'btn-primary-outline border-white text-white hover:bg-white hover:text-kyzz-dark inline-block mt-2' : 'btn-primary inline-block mt-2'}
            >
              {config.heroCta}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Categorías ───────────────────────────────────────── */}
      <HomeCategorySection categories={categories} />

      {/* ── Recién llegadas ──────────────────────────────────── */}
      <HomeNewArrivalsSection
        products={newArrivalsData.products}
        variantColors={newArrivalsData.variantColors}
      />

      {/* ── Colección Especial ────────────────────────────────── */}
      <HomeFeaturedSection
        products={featuredData.products}
        variantColors={featuredData.variantColors}
      />

      {/* ── Brand Story / Frase de marca ─────────────────────────── */}
      <HomeEditorialSplit
        imageUrl={config.brandStoryImageUrl ?? null}
        text={config.brandStoryText ?? null}
      />

      {/* ── Viste recientemente ───────────────────────────────── */}
      <HomeRecentlyViewed />
    </>
  );
}
