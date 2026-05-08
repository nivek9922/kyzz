import type { Size } from '@/interfaces';
import clsx from 'clsx';

interface Props {
  selectedSize?: Size;
  availableSizes: Size[];
  onSizeChanged: (size: Size) => void;
}

export const SizeSelector = ({ selectedSize, availableSizes, onSizeChanged }: Props) => {
  return (
    <div>
      <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted mb-3">Talla</p>
      <div className="flex flex-wrap gap-2">
        {availableSizes.map((size) => (
          <button
            key={size}
            onClick={() => onSizeChanged(size)}
            className={clsx(
              'w-11 h-11 text-[11px] tracking-widest uppercase border transition-colors duration-200',
              {
                'border-kyzz-dark bg-kyzz-dark text-white': size === selectedSize,
                'border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary': size !== selectedSize,
              }
            )}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
};