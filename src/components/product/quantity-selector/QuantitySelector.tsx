'use client';

interface Props {
  quantity: number;
  onQuantityChanged: (value: number) => void;
}

export const QuantitySelector = ({ quantity, onQuantityChanged }: Props) => {
  const onValueChanged = (value: number) => {
    if (quantity + value < 1) return;
    onQuantityChanged(quantity + value);
  };

  return (
    <div className="flex items-center gap-0">
      <button
        onClick={() => onValueChanged(-1)}
        className="w-9 h-9 flex items-center justify-center border border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary transition-colors duration-200 text-base leading-none"
        aria-label="Reducir cantidad"
      >
        &minus;
      </button>
      <span className="w-12 h-9 flex items-center justify-center border-y border-kyzz-secondary text-sm text-kyzz-dark tabular-nums">
        {quantity}
      </span>
      <button
        onClick={() => onValueChanged(+1)}
        className="w-9 h-9 flex items-center justify-center border border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary transition-colors duration-200 text-base leading-none"
        aria-label="Aumentar cantidad"
      >
        &#43;
      </button>
    </div>
  );
};