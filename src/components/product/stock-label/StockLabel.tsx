"use client";

import { useEffect, useState, useCallback } from "react";
import { getStockBySlug } from "@/actions";

interface Props {
  slug: string;
}

export const StockLabel = ({ slug }: Props) => {
  const [stock, setStock] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStock = useCallback(async () => {
    const inStock = await getStockBySlug(slug);
    setStock(inStock);
    setIsLoading(false);
  }, [slug]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  if (isLoading) {
    return (
      <div className="h-5 w-24 bg-kyzz-secondary animate-pulse rounded" />
    );
  }

  return (
    <p className="text-xs tracking-widest uppercase text-kyzz-muted">
      {stock > 0 ? `${stock} disponibles` : "Agotado"}
    </p>
  );
};

