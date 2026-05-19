import { titleFont } from '@/config/fonts';
import prisma from '@/lib/prisma';
import { NewsletterComposer } from './ui/NewsletterComposer';

export const revalidate = 0;

export default async function AdminNewsletterPage() {
  const [subscribers, products] = await Promise.all([
    prisma.subscriber.findMany({
      where:   { unsubscribedAt: null },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, name: true, email: true, source: true, receivedCoupon: true, createdAt: true, isActive: true },
    }),
    prisma.product.findMany({
      where:   { inStock: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      take:    24,
      select: {
        id:    true,
        title: true,
        price: true,
        slug:  true,
        ProductImage: { take: 1, select: { url: true } },
        ProductColors: {
          take: 1,
          select: {
            images: {
              take:    1,
              orderBy: { sortOrder: 'asc' },
              select:  { url: true },
            },
          },
        },
      },
    }),
  ]);

  const productOptions = products.map(p => ({
    id:       p.id,
    title:    p.title,
    price:    p.price,
    slug:     p.slug,
    imageUrl: p.ProductImage[0]?.url ?? p.ProductColors[0]?.images[0]?.url ?? '',
  }));

  const subscriberCount = subscribers.length;

  return (
    <div className="max-w-4xl mx-auto">
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

      {/* ── Lista de suscriptoras ─────────────────────────── */}
      <div className="mt-16">
        <h2 className={`${titleFont.className} text-xl font-normal text-kyzz-dark mb-6`}>
          Suscriptoras ({subscriberCount})
        </h2>
        {subscribers.length === 0 ? (
          <p className="text-[11px] tracking-widest uppercase text-kyzz-muted">Sin suscriptoras aún</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kyzz-secondary">
                  {["Nombre", "Email", "Origen", "Descuento enviado", "Fecha"].map((h) => (
                    <th key={h} className="text-left text-[9px] tracking-[0.3em] uppercase text-kyzz-muted py-3 pr-6 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-kyzz-secondary/50">
                {subscribers.map((s) => (
                  <tr key={s.id} className="hover:bg-kyzz-tertiary/40 transition-colors">
                    <td className="py-3.5 pr-6 text-[13px] text-kyzz-dark">{s.name ?? "—"}</td>
                    <td className="py-3.5 pr-6 text-[12px] text-kyzz-muted">{s.email}</td>
                    <td className="py-3.5 pr-6 text-[10px] tracking-widest uppercase text-kyzz-muted">{s.source}</td>
                    <td className="py-3.5 pr-6">
                      <span className={`text-[10px] tracking-widest uppercase ${s.receivedCoupon ? "text-kyzz-primary" : "text-kyzz-muted"}`}>
                        {s.receivedCoupon ? "Sí — KYZZ10" : "No"}
                      </span>
                    </td>
                    <td className="py-3.5 text-[11px] text-kyzz-muted">
                      {s.createdAt.toLocaleDateString("es-CO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
