import { Product } from '@/interfaces';
import type { ProductColorsMap } from '@/actions/product/product-pagination';
import { ProductGridItem } from './ProductGridItem';

/** 0 = portrait 1-columna (solo mobile), 1 = lista horizontal, 2-6 = grid */
export type Columns = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface Props {
  products:       Product[];
  columns?:       Columns;
  variantColors?: ProductColorsMap;
  gapOverride?:   string;
  compactMode?:   boolean;
}

const colsClass: Record<Columns, string> = {
  0: 'grid-cols-1',
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
  6: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6',
};

// Indica al browser qué tamaño ocupará cada imagen según las columnas activas,
// para que Next.js sirva el srcset correcto (evita imágenes sub-dimensionadas estiradas).
const imageSizesMap: Record<Columns, string> = {
  0: '100vw',
  1: '128px',
  2: '(max-width: 640px) 50vw, 50vw',
  3: '(max-width: 640px) 50vw, 33vw',
  4: '(max-width: 640px) 50vw, 25vw',
  5: '(max-width: 640px) 50vw, 20vw',
  6: '(max-width: 640px) 33vw, 16vw',
};

export const ProductGrid = ({ products, columns = 3, variantColors = {}, gapOverride, compactMode = false }: Props) => {
  const isListView  = columns === 1;
  const gap         = gapOverride ?? 'gap-6';
  const imageSizes  = imageSizesMap[columns];

  return (
    <div className={isListView ? 'flex flex-col' : `grid ${colsClass[columns]} ${gap} mb-10`}>
      {products.map((product) => (
        <ProductGridItem
          key={product.slug}
          product={product}
          listView={isListView}
          colorVariants={variantColors[product.id]}
          compactMode={compactMode}
          imageSizes={imageSizes}
        />
      ))}
    </div>
  );
};
