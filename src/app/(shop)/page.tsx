export const revalidate = 60;

import Link from 'next/link';
import Image from 'next/image';
import { getFeaturedProducts, getSiteConfig } from '@/actions';
import { HomeRecentlyViewed } from './ui/HomeRecentlyViewed';
import { ProductGridItem } from '@/components';
import {
  IoLeafOutline,
  IoDiamondOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';

const features = [
  {
    icon: IoLeafOutline,
    title: 'Calidad Premium',
    desc: 'Materiales seleccionados meticulosamente para asegurar una durabilidad y tacto excepcionales.',
  },
  {
    icon: IoDiamondOutline,
    title: 'Diseño Único',
    desc: 'Siluetas atemporales con un enfoque minimalista que trasciende las tendencias pasajeras.',
  },
  {
    icon: IoShieldCheckmarkOutline,
    title: 'Precio Justo',
    desc: 'Lujo accesible. Creemos en la transparencia y en ofrecer un valor real por cada pieza.',
  },
];

export default async function Home() {
  const [featuredData, config] = await Promise.all([
    getFeaturedProducts(),
    getSiteConfig(),
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

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="bg-kyzz-neutral py-20 border-b border-kyzz-secondary">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title}>
              <Icon className="text-kyzz-primary mx-auto mb-4" size={26} strokeWidth={1} />
              <h3 className="font-serif text-lg text-kyzz-dark mb-3">{title}</h3>
              <p className="text-sm text-kyzz-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

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
          {/* Mobile: scroll horizontal — 2 cards visibles + ~25% de la 3ra asoma */}
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 -mr-6 md:mr-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-x-visible">
            {featuredProducts.map((product) => (
              <div key={product.slug} className="shrink-0 w-[43%] md:w-auto">
                <ProductGridItem
                  product={product}
                  colorVariants={featuredColors[product.id]}
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
