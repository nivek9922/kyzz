"use client";

import { ProductGrid } from "./ProductGrid";
import { GridLayoutSelector } from "./GridLayoutSelector";
import { useGridLayout, type GridLayoutState } from "@/hooks/useGridLayout";
import type { Product } from "@/interfaces";
import type { VariantColorMap } from "@/actions/product/product-pagination";

interface Props {
  products:        Product[];
  variantColors?:  VariantColorMap;
  totalCount?:     number;
  externalLayout?: GridLayoutState;
}

export const ProductGridWithLayout = ({ products, variantColors = {}, totalCount, externalLayout }: Props) => {
  const internalLayout = useGridLayout({
    storageKeyMobile:  "kyzz-grid-cols-mobile",
    storageKeyDesktop: "kyzz-grid-cols-desktop",
  });

  const { isMobile, effectiveCols, mounted, gapClass, handleChange } = externalLayout ?? internalLayout;
  const displayCount = totalCount ?? products.length;

  return (
    <>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <p className="text-xs text-kyzz-muted">
          {displayCount} {displayCount === 1 ? "producto" : "productos"}
        </p>
        {mounted && (
          <GridLayoutSelector
            columns={effectiveCols}
            onChange={handleChange}
            isMobile={isMobile}
          />
        )}
      </div>
      <ProductGrid
        products={products}
        columns={effectiveCols}
        variantColors={variantColors}
        gapOverride={gapClass}
        compactMode={isMobile && effectiveCols === 3}
      />
    </>
  );
};
