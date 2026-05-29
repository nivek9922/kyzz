import { Footer, Sidebar, TopMenu, WhatsappFloat } from '@/components';
import { getCategories, getFeaturedCount } from '@/actions';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [categories, featuredCount] = await Promise.all([
    getCategories(),
    getFeaturedCount(),
  ]);
  const showFeaturedInMenu = featuredCount >= 1;

  return (
    <main className="min-h-screen flex flex-col bg-kyzz-neutral">
      <TopMenu categories={categories} showFeatured={showFeaturedInMenu} />
      <Sidebar showFeatured={showFeaturedInMenu} />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
      <WhatsappFloat />
    </main>
  );
}