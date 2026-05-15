'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { IoChevronDown } from 'react-icons/io5';

interface Props {
  children: React.ReactNode;
  maxHeight?: string;
}

export function CartScrollable({ children, maxHeight = '480px' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const scrollable = el.scrollHeight > el.clientHeight;
    const notAtBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 8;
    setCanScrollDown(scrollable && notAtBottom);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Check on mount and whenever children change height
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    el.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', checkScroll);
    };
  }, [checkScroll]);

  return (
    <div className="relative">
      <div
        ref={ref}
        className="overflow-y-auto scrollbar-none"
        style={{ maxHeight }}
      >
        {children}
      </div>

      {/* Fade + chevron — solo visible cuando hay contenido oculto abajo */}
      <div
        className={`
          absolute bottom-0 left-0 right-0 h-16
          bg-gradient-to-t from-kyzz-neutral to-transparent
          pointer-events-none flex items-end justify-center pb-1
          transition-opacity duration-300
          ${canScrollDown ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <IoChevronDown
          size={14}
          className="text-kyzz-muted animate-bounce"
        />
      </div>
    </div>
  );
}
