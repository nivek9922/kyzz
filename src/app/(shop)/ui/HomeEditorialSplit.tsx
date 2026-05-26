import Image from 'next/image';
import Link from 'next/link';

interface Props {
  imageUrl:  string | null;
  text:      string | null;
}

export function HomeEditorialSplit({ imageUrl, text }: Props) {
  if (!imageUrl && !text) {
    return (
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
    );
  }

  return (
    <section className="w-full">
      <div className="flex flex-col md:flex-row min-h-[480px]">

        {/* Imagen */}
        {imageUrl && (
          <div className="relative w-full md:w-1/2 aspect-[4/3] md:aspect-auto">
            <Image
              src={imageUrl}
              alt="Brand Story KYZZ"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center"
            />
          </div>
        )}

        {/* Texto */}
        <div
          className={`flex items-center justify-center bg-kyzz-tertiary px-8 py-16 md:py-20 md:px-16 ${
            imageUrl ? 'w-full md:w-1/2' : 'w-full'
          }`}
        >
          <div className="max-w-sm w-full">
            <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-4">
              Nuestra historia
            </p>
            <blockquote className="font-serif text-2xl md:text-3xl text-kyzz-dark leading-snug italic mb-8 whitespace-pre-line">
              &ldquo;{text ?? 'Un beso a tu estilo propio.\nKyzz nace de la unión y el detalle.'}&rdquo;
            </blockquote>
            <div className="kyzz-divider-left mb-8" />
            <Link
              href="/products"
              className="text-[11px] tracking-[0.25em] uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
            >
              Explorar todas las piezas →
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
