'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { ProductGridItem } from '@/components';
import type { ProductColorEntry } from '@/actions/product/product-pagination';
import type { Product } from '@/interfaces';

interface Props {
  products:      Product[];
  variantColors: Record<string, ProductColorEntry[]>;
  listName:      string;
  desktopCols?:  3 | 4;
}

export function ProductScrollRow({ products, variantColors, listName, desktopCols = 4 }: Props) {
  const trackRef  = useRef<HTMLDivElement>(null);
  const isDragging  = useRef(false);
  const dragStart   = useRef(0);
  const scrollStart = useRef(0);
  const hasDragged  = useRef(false);
  const [grabbing,  setGrabbing]  = useState(false);
  const [canPrev,   setCanPrev]   = useState(false);
  const [canNext,   setCanNext]   = useState(false);

  const checkArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    checkArrows();
    const ro = new ResizeObserver(checkArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [checkArrows]);

  const onTrackScroll = checkArrows;

  const scroll = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-card]');
    const cardW = card ? card.offsetWidth + 24 : el.clientWidth * 0.28;
    el.scrollBy({ left: dir * cardW, behavior: 'smooth' });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current  = true;
    hasDragged.current  = false;
    dragStart.current   = e.clientX;
    scrollStart.current = trackRef.current?.scrollLeft ?? 0;
    setGrabbing(true);
    e.preventDefault();
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current;
    if (Math.abs(dx) > 5) hasDragged.current = true;
    if (trackRef.current) trackRef.current.scrollLeft = scrollStart.current - dx;
  };

  const onMouseUp = () => { isDragging.current = false; setGrabbing(false); };

  const onClickCapture = (e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDragged.current = false;
    }
  };

  return (
    <div className="relative">

      {/* Flecha izquierda — solo desktop */}
      <button
        onClick={() => scroll(-1)}
        disabled={!canPrev}
        aria-label="Anterior"
        className={`hidden md:flex absolute left-0 top-[40%] -translate-x-1/2 -translate-y-1/2 z-10
          w-9 h-9 rounded-full bg-white border border-kyzz-secondary shadow-sm
          items-center justify-center transition-all duration-200
          ${canPrev ? 'hover:bg-kyzz-tertiary' : 'opacity-0 pointer-events-none'}`}
      >
        <IoChevronBack size={15} className="text-kyzz-dark" />
      </button>

      {/* Track */}
      <div
        ref={trackRef}
        onScroll={onTrackScroll}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClickCapture={onClickCapture}
        className={`flex gap-4 md:gap-6 overflow-x-auto scrollbar-none pb-2
          -mr-6 md:mr-0 select-none
          ${grabbing ? 'cursor-grabbing' : 'md:cursor-grab'}`}
      >
        {products.map((product, idx) => (
          <div
            key={product.slug}
            data-card
            className={
              desktopCols === 3
                ? 'shrink-0 w-[43%] md:w-[calc(33.333%-16px)]'
                : 'shrink-0 w-[43%] md:w-[calc(25%-18px)]'
            }
          >
            <ProductGridItem
              product={product}
              colorVariants={variantColors[product.id]}
              listName={listName}
              imageSizes={desktopCols === 3
                ? '(max-width: 768px) 43vw, 33vw'
                : '(max-width: 768px) 43vw, 25vw'}
              priority={idx < 2}
            />
          </div>
        ))}
      </div>

      {/* Flecha derecha — solo desktop */}
      <button
        onClick={() => scroll(1)}
        disabled={!canNext}
        aria-label="Siguiente"
        className={`hidden md:flex absolute right-0 top-[40%] translate-x-1/2 -translate-y-1/2 z-10
          w-9 h-9 rounded-full bg-white border border-kyzz-secondary shadow-sm
          items-center justify-center transition-all duration-200
          ${canNext ? 'hover:bg-kyzz-tertiary' : 'opacity-0 pointer-events-none'}`}
      >
        <IoChevronForward size={15} className="text-kyzz-dark" />
      </button>

    </div>
  );
}
