import { titleFont } from '@/config/fonts';
import prisma from '@/lib/prisma';
import { NewsletterComposer } from './ui/NewsletterComposer';

export const revalidate = 0;

export default async function AdminNewsletterPage() {
  const [subscriberCount, products] = await Promise.all([
    prisma.subscriber.count({ where: { unsubscribedAt: null } }),
    prisma.product.findMany({
      where: { inStock: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take: 24,
      include: { ProductImage: { take: 1, select: { url: true } } },
    }),
  ]);

  const productOptions = products.map(p => ({
    id:       p.id,
    title:    p.title,
    price:    p.price,
    slug:     p.slug,
    imageUrl: p.ProductImage[0]?.url ?? '',
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Admin</p>
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Newsletter
        </h1>
        <div className="w-6 h-px bg-kyzz-secondary mt-3" />
      </div>

      <NewsletterComposer
        products={productOptions}
        subscriberCount={subscriberCount}
      />
    </div>
  );
}
