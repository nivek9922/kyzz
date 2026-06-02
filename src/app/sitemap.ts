import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where:  { isArchived: false },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`,                  changeFrequency: 'daily',   priority: 1.0 },
    { url: `${siteUrl}/products`,          changeFrequency: 'daily',   priority: 0.9 },
    { url: `${siteUrl}/coleccion-especial`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/contacto`,          changeFrequency: 'monthly', priority: 0.4 },
  ];

  // URL canónica de categoría = PLP filtrada (/categoria/[slug] solo redirige aquí)
  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url:             `${siteUrl}/products?category=${c.slug}`,
    changeFrequency: 'weekly',
    priority:        0.7,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url:             `${siteUrl}/product/${p.slug}`,
    lastModified:    p.updatedAt,
    changeFrequency: 'weekly',
    priority:        0.6,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
