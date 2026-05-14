"use client";

import { useState, useEffect } from "react";
import { ProductGrid } from "./ProductGrid";
import { GridLayoutSelector, type Columns } from "./GridLayoutSelector";
import type { Product } from "@/interfaces";

interface Props {
  products: Product[];
}

const STORAGE_KEY = "kyzz-grid-cols";

export const ProductGridWithLayout = ({ products }: Props) => {
  const [columns, setColumns] = useState<Columns>(3);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "2" || saved === "3" || saved === "6") {
      setColumns(Number(saved) as Columns);
    }
    setMounted(true);
  }, []);

  const handleChange = (cols: Columns) => {
    setColumns(cols);
    localStorage.setItem(STORAGE_KEY, String(cols));
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-kyzz-muted">{products.length} {products.length === 1 ? "producto" : "productos"}</p>
        {mounted && <GridLayoutSelector columns={columns} onChange={handleChange} />}
      </div>
      <ProductGrid products={products} columns={columns} />
    </>
  );
};
