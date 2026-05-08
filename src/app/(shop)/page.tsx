export const revalidate = 60;

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getPaginatedProductsWithImages } from '@/actions';
import { Pagination, ProductGrid } from '@/components';

interface Props {
  searchParams: {
    page?: string;
  };
}

const features = [
  {
    icon: '◈',
    title: 'Calidad Premium',
    desc: 'Materiales seleccionados meticulosamente para asegurar una durabilidad y tacto excepcionales.',
  },
  {
    icon: '✦',
    title: 'Diseño Único',
    desc: 'Siluetas atemporales con un enfoque minimalista que trasciende las tendencias pasajeras.',
  },
  {
    icon: '◎',
    title: 'Precio Justo',
    desc: 'Lujo accesible. Creemos en la transparencia y en ofrecer un valor real por cada pieza.',
  },
];

export default async function Home({ searchParams }: Props) {
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const { products, totalPages } = await getPaginatedProductsWithImages({ page });

  if (products.length === 0) redirect('/');

  const isFirstPage = page === 1;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      {isFirstPage && (
        <section className="relative w-full h-[82vh] min-h-[520px] bg-kyzz-secondary overflow-hidden flex items-center justify-center">
          {/* Texto centrado sobre fondo de color hasta tener imagen real */}
          <div className="relative z-10 text-center px-6">
            <p className="text-xs tracking-[0.4em] uppercase text-kyzz-muted mb-4">
              Nueva colección
            </p>
            <h1 className="font-serif text-5xl md:text-7xl text-kyzz-dark leading-tight mb-6">
              Kyzz: Basics for<br />every you
            </h1>
            <Link href="/gender/women" className="btn-primary inline-block mt-2">
              Explorar colección
            </Link>
          </div>
          {/* Ornamento de fondo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none select-none">
            <span className="font-serif text-[32vw] text-kyzz-dark leading-none">K</span>
          </div>
        </section>
      )}

      {/* ── Features ─────────────────────────────────────────── */}
      {isFirstPage && (
        <section className="bg-kyzz-neutral py-20 border-b border-kyzz-secondary">
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
            {features.map(({ icon, title, desc }) => (
              <div key={title}>
                <span className="text-kyzz-primary text-2xl block mb-4">{icon}</span>
                <h3 className="font-serif text-lg text-kyzz-dark mb-3">{title}</h3>
                <p className="text-sm text-kyzz-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Colección ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        {isFirstPage && (
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl text-kyzz-dark mb-3">Colección Esencial</h2>
            <div className="kyzz-divider" />
            <Link
              href="/gender/women"
              className="text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors mt-4 inline-block"
            >
              Ver todo
            </Link>
          </div>
        )}

        <ProductGrid products={products} />
        <div className="mt-10">
          <Pagination totalPages={totalPages} />
        </div>
      </section>

      {/* ── Frase de marca ───────────────────────────────────── */}
      {isFirstPage && (
        <section className="bg-kyzz-tertiary py-24 text-center px-6">
          <blockquote className="font-serif text-2xl md:text-4xl text-kyzz-dark max-w-2xl mx-auto leading-snug italic">
            "Un beso a tu estilo propio.<br />Kyzz nace de la unión y el detalle."
          </blockquote>
          <div className="kyzz-divider mt-8" />
        </section>
      )}
    </>
  );
}
