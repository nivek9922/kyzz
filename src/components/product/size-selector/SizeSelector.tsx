import type { Size } from '@/interfaces';
import clsx from 'clsx';

interface Props {
  selectedSize?:    Size;
  availableSizes:   Size[];
  onSizeChanged:    (size: Size) => void;
  outOfStockSizes?: Size[]; // tallas existentes pero sin stock
}

export const SizeSelector = ({ selectedSize, availableSizes, onSizeChanged, outOfStockSizes = [] }: Props) => {
  return (
    <div>
      <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted mb-3">Talla</p>
      <div className="flex flex-wrap gap-2">
        {availableSizes.map((size) => {
          const sold = outOfStockSizes.includes(size);
          const active = size === selectedSize;
          return (
            <button
              key={size}
              onClick={() => !sold && onSizeChanged(size)}
              disabled={sold}
              title={sold ? `${size} — Agotada` : size}
              className={clsx(
                'relative w-11 h-11 text-[11px] tracking-widest uppercase border transition-colors duration-200',
                {
                  'border-kyzz-dark bg-kyzz-dark text-white': active && !sold,
                  'border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary': !active && !sold,
                  'border-kyzz-secondary text-kyzz-muted/50 cursor-not-allowed bg-kyzz-neutral/40': sold,
                }
              )}
            >
              {size}
              {sold && (
                <span className="pointer-events-none absolute left-1/2 top-1/2 w-8 h-px bg-kyzz-muted/60 -translate-x-1/2 -translate-y-1/2 rotate-45" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
