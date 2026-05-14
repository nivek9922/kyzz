import { Product } from '@/interfaces';
import { ProductGridItem } from './ProductGridItem';

type Columns = 2 | 3 | 6;

interface Props {
  products: Product[];
  columns?: Columns;
}

const colsClass: Record<Columns, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  6: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6',
};

export const ProductGrid = ({ products, columns = 3 }: Props) => {
  return (
    <div className={`grid ${colsClass[columns]} gap-6 mb-10`}>
      {products.map((product) => (
        <ProductGridItem key={product.slug} product={product} />
      ))}
    </div>
  );
};