import { Footer, Sidebar, TopMenu } from '@/components';

export default function ShopLayout( { children }: {
  children: React.ReactNode;
} ) {
  return (
    <main className="min-h-screen flex flex-col bg-kyzz-neutral">
      <TopMenu />
      <Sidebar />
      <div className="flex-1">
        { children }
      </div>
      <Footer />
    </main>
  );
}