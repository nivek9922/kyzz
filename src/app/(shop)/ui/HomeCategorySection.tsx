'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

interface Category {
  id:           string;
  name:         string;
  slug:         string;
  imageUrl:     string | null;
  imageLightBg: boolean;
}

interface Props {
  categories: Category[];
}

const FALLBACK_BG = [
  'bg-[#E8DDD6]',
  'bg-[#D6CEC9]',
  'bg-[#EDE3DA]',
  'bg-[#DACED5]',
];

/* ── Tarjeta de categoría (desktop) ── */
function CategoryCard({ cat, i, sizes }: { cat: Category; i: number; sizes: string }) {
  return (
    <Link href={`/products?category=${cat.slug}`} className="group block">
      <div className="relative overflow-hidden aspect-[3/4]">
        {cat.imageUrl ? (
          <Image
            src={cat.imageUrl}
            alt={cat.name}
            fill
            sizes={sizes}
            className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className={`absolute inset-0 ${FALLBACK_BG[i % FALLBACK_BG.length]} flex items-center justify-center`}>
            <span className="font-serif text-[8vw] text-kyzz-dark/10 leading-none select-none">
              {cat.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-[11px] tracking-[0.25em] uppercase text-kyzz-dark group-hover:text-kyzz-primary transition-colors duration-200">
        {cat.name}
      </p>
    </Link>
  );
}

const AUTOPLAY_MS = 4000;

/* ── Componente principal ── */
export function HomeCategorySection({ categories }: Props) {
  // ── Mobile refs
  const trackRef      = useRef<HTMLDivElement>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef     = useRef(0);
  const userScrollRef = useRef(false);
  const [active, setActive] = useState(0);

  // ── Desktop carousel refs
  const desktopRef  = useRef<HTMLDivElement>(null);
  const isDragging  = useRef(false);
  const dragStart   = useRef(0);
  const scrollStart = useRef(0);
  const hasDragged  = useRef(false);
  const [grabbing,       setGrabbing]       = useState(false);
  const [desktopCanPrev, setDesktopCanPrev] = useState(false);
  const [desktopCanNext, setDesktopCanNext] = useState(categories.length > 4);

  if (categories.length === 0) return null;

  const goTo = useCallback((i: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const next = (activeRef.current + 1) % categories.length;
      goTo(next);
    }, AUTOPLAY_MS);
  }, [categories.length, goTo]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || categories.length < 2) return;

    const el = trackRef.current;
    if (!el) return;

    // Pause autoplay when section is off-screen
    const observer = new IntersectionObserver(
      ([entry]) => { entry.isIntersecting ? startTimer() : stopTimer(); },
      { threshold: 0.3 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      stopTimer();
    };
  }, [categories.length, startTimer, stopTimer]);

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    activeRef.current = idx;
    setActive(idx);

    // Reset autoplay timer on manual swipe
    if (userScrollRef.current) startTimer();
  };

  const onTouchStart = () => { userScrollRef.current = true; };
  const onTouchEnd   = () => { userScrollRef.current = false; };

  // ── Desktop carousel handlers
  const onDesktopScroll = () => {
    const el = desktopRef.current;
    if (!el) return;
    setDesktopCanPrev(el.scrollLeft > 1);
    setDesktopCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  const scrollDesktop = (dir: 1 | -1) => {
    const el = desktopRef.current;
    if (!el) return;
    const cardWidth = el.clientWidth / Math.min(4, categories.length);
    el.scrollBy({ left: dir * cardWidth, behavior: 'smooth' });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current  = true;
    hasDragged.current  = false;
    dragStart.current   = e.clientX;
    scrollStart.current = desktopRef.current?.scrollLeft ?? 0;
    setGrabbing(true);
    e.preventDefault();
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current;
    if (Math.abs(dx) > 5) hasDragged.current = true;
    if (desktopRef.current) desktopRef.current.scrollLeft = scrollStart.current - dx;
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
    <section className="w-full py-12 md:py-20">

      {/* ── Header ── */}
      <div className="max-w-7xl mx-auto px-6 mb-8 md:mb-10 flex items-end justify-between">
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">
            Explora por estilo
          </p>
          <h2 className="font-serif text-3xl text-kyzz-dark">Categorías</h2>
          <div className="kyzz-divider-left mt-4" />
        </div>
        <Link
          href="/products"
          className="text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
        >
          Ver todo
        </Link>
      </div>

      {/* ── Mobile: slider scroll-snap nativo (swipe táctil real) ── */}
      <div className="md:hidden">
        <div
          ref={trackRef}
          onScroll={onScroll}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="flex overflow-x-auto scrollbar-none snap-x snap-mandatory"
        >
          {categories.map((cat, i) => (
            <div key={cat.slug} className="w-full shrink-0 snap-center">
              <Link href={`/products?category=${cat.slug}`} className="block">
                <div className="relative aspect-[3/4]">
                  {cat.imageUrl ? (
                    <Image
                      src={cat.imageUrl}
                      alt={cat.name}
                      fill
                      sizes="100vw"
                      className="object-cover object-center"
                    />
                  ) : (
                    <div className={`absolute inset-0 ${FALLBACK_BG[i % FALLBACK_BG.length]} flex items-center justify-center`}>
                      <span className="font-serif text-[32vw] text-kyzz-dark/10 leading-none select-none">
                        {cat.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-center text-[11px] tracking-[0.25em] uppercase text-kyzz-dark">
                  {cat.name}
                </p>
              </Link>
            </div>
          ))}
        </div>

        {/* Dots */}
        {categories.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3">
            {categories.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Ir a categoría ${i + 1}`}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === active
                    ? 'bg-kyzz-primary w-5'
                    : 'bg-kyzz-secondary w-1.5 hover:bg-kyzz-muted'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop: carrusel 4 columnas + drag + flechas ── */}
      <div className="hidden md:block relative">

        {/* Flecha izquierda */}
        {categories.length > 4 && (
          <button
            onClick={() => scrollDesktop(-1)}
            disabled={!desktopCanPrev}
            aria-label="Categoría anterior"
            className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow transition-all duration-200 ${desktopCanPrev ? 'hover:bg-white' : 'opacity-30 cursor-not-allowed'}`}
          >
            <IoChevronBack size={16} className="text-kyzz-dark" />
          </button>
        )}

        {/* Track */}
        <div
          ref={desktopRef}
          onScroll={onDesktopScroll}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onClickCapture={onClickCapture}
          className={`flex overflow-x-auto scrollbar-none select-none ${grabbing ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          {categories.map((cat, i) => (
            <div key={cat.slug} className="shrink-0 w-1/4">
              <CategoryCard cat={cat} i={i} sizes="25vw" />
            </div>
          ))}
        </div>

        {/* Flecha derecha */}
        {categories.length > 4 && (
          <button
            onClick={() => scrollDesktop(1)}
            disabled={!desktopCanNext}
            aria-label="Categoría siguiente"
            className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow transition-all duration-200 ${desktopCanNext ? 'hover:bg-white' : 'opacity-30 cursor-not-allowed'}`}
          >
            <IoChevronForward size={16} className="text-kyzz-dark" />
          </button>
        )}

      </div>

    </section>
  );
}
