import { Product } from '@/interfaces';
import type { ProductColorsMap } from '@/actions/product/product-pagination';
import { ProductGridItem } from './ProductGridItem';

export type Columns = 1 | 2 | 3 | 4 | 5 | 6;

interface Props {
  products:      Product[];
  columns?:      Columns;
  variantColors?: ProductColorsMap;
}

const colsClass: Record<Columns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
  6: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6',
};

export const ProductGrid = ({ products, columns = 3, variantColors = {} }: Props) => {
  const isListView = columns === 1;

  return (
    <div className={isListView ? 'flex flex-col' : `grid ${colsClass[columns]} gap-6 mb-10`}>
      {products.map((product) => (
        <ProductGridItem
          key={product.slug}
          product={product}
          listView={isListView}
          colorVariants={variantColors[product.id]}
        />
      ))}
    </div>
  );
};
