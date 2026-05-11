import { titleFont } from '@/config/fonts';
import prisma from '@/lib/prisma';
import { CategoryManager } from './ui/CategoryManager';

export default async function AdminCategoriasPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { Product: true } } },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-10 justify-center">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Admin</p>
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Categorías
        </h1>
        <div className="w-6 h-px bg-kyzz-secondary mt-3" />
      </div>

      <CategoryManager initialCategories={categories} />
    </div>
  );
}
