import Image from 'next/image';
import Link from 'next/link';
import { titleFont } from '@/config/fonts';
import { currencyFormat } from '@/utils';
import { getCartRecommendations } from '@/actions/product/get-cart-recommendations';

interface Props {
  productId: string;
}

const imgSrc = (url: string) =>
  !url ? '/imgs/placeholder.jpg' : url.startsWith('http') ? url : `/products/${url}`;

export async function ProductRecommendations({ productId }: Props) {
  const recommendations = await getCartRecommendations([productId]);
  if (recommendations.length === 0) return null;

  return (
    <section className="mt-16 pt-12 border-t border-kyzz-secondary">

      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px bg-kyzz-secondary" />
        <div className="text-center">
          <p className="text-[9px] tracking-[0.4em] uppercase text-kyzz-muted">para ti</p>
          <h2 className={`${titleFont.className} text-xl font-normal text-kyzz-dark mt-0.5`}>
            Completa tu look
          </h2>
        </div>
        <div className="flex-1 h-px bg-kyzz-secondary" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {recommendations.map((product) => (
          <Link key={product.id} href={`/product/${product.slug}`} className="group">
            <div className="relative aspect-[3/4] overflow-hidden bg-kyzz-tertiary">
              <Image
                src={imgSrc(product.image)}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="mt-3">
              <p className="text-[11px] tracking-wide text-kyzz-dark truncate group-hover:text-kyzz-primary transition-colors">
                {product.title}
              </p>
              <p className="text-[11px] text-kyzz-muted mt-0.5">
                {currencyFormat(product.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>

    </section>
  );
}

export function ProductRecommendationsSkeleton() {
  return (
    <section className="mt-16 pt-12 border-t border-kyzz-secondary">
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px bg-kyzz-secondary" />
        <div className="text-center space-y-1.5">
          <div className="h-2 w-12 bg-kyzz-secondary/50 animate-pulse mx-auto" />
          <div className="h-5 w-36 bg-kyzz-secondary/50 animate-pulse mx-auto" />
        </div>
        <div className="flex-1 h-px bg-kyzz-secondary" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[3/4] bg-kyzz-secondary/40 animate-pulse" />
            <div className="mt-3 space-y-1.5">
              <div className="h-2.5 w-3/4 bg-kyzz-secondary/40 animate-pulse" />
              <div className="h-2.5 w-1/3 bg-kyzz-secondary/40 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
