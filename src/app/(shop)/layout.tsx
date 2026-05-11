import { Footer, Sidebar, TopMenu } from '@/components';
import { getCategories } from '@/actions';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories();

  return (
    <main className="min-h-screen flex flex-col bg-kyzz-neutral">
      <TopMenu categories={categories} />
      <Sidebar />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </main>
  );
}