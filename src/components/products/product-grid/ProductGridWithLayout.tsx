"use client";

import { useState, useEffect } from "react";
import { ProductGrid, type Columns } from "./ProductGrid";
import { GridLayoutSelector } from "./GridLayoutSelector";
import type { Product } from "@/interfaces";

interface Props {
  products: Product[];
}

const STORAGE_KEY = "kyzz-grid-cols";
const DEFAULT_COLS: Columns = 3;
const VALID: Columns[] = [1, 2, 3, 4, 5, 6];

export const ProductGridWithLayout = ({ products }: Props) => {
  const [columns, setColumns] = useState<Columns>(DEFAULT_COLS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY)) as Columns;
    if (VALID.includes(saved)) setColumns(saved);
    setMounted(true);
  }, []);

  const handleChange = (cols: Columns) => {
    setColumns(cols);
    localStorage.setItem(STORAGE_KEY, String(cols));
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-kyzz-muted">
          {products.length} {products.length === 1 ? "producto" : "productos"}
        </p>
        {mounted && <GridLayoutSelector columns={columns} onChange={handleChange} />}
      </div>
      <ProductGrid products={products} columns={columns} />
    </>
  );
};
