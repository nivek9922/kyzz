"use client";

export type Columns = 2 | 3 | 6;

interface Props {
  columns: Columns;
  onChange: (cols: Columns) => void;
}

// SVG icons as inline components — no extra dependency
const IconTwo = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="6" height="14" rx="0.5" />
    <rect x="9" y="1" width="6" height="14" rx="0.5" />
  </svg>
);

const IconThree = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1"  y="1" width="4" height="14" rx="0.5" />
    <rect x="6"  y="1" width="4" height="14" rx="0.5" />
    <rect x="11" y="1" width="4" height="14" rx="0.5" />
  </svg>
);

const IconSix = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1"  y="1" width="2" height="6"  rx="0.5" />
    <rect x="4"  y="1" width="2" height="6"  rx="0.5" />
    <rect x="7"  y="1" width="2" height="6"  rx="0.5" />
    <rect x="10" y="1" width="2" height="6"  rx="0.5" />
    <rect x="13" y="1" width="2" height="6"  rx="0.5" />
    <rect x="1"  y="9" width="2" height="6"  rx="0.5" />
    <rect x="4"  y="9" width="2" height="6"  rx="0.5" />
    <rect x="7"  y="9" width="2" height="6"  rx="0.5" />
    <rect x="10" y="9" width="2" height="6"  rx="0.5" />
    <rect x="13" y="9" width="2" height="6"  rx="0.5" />
  </svg>
);

const OPTIONS: { cols: Columns; Icon: React.FC; label: string }[] = [
  { cols: 2, Icon: IconTwo,   label: "2 columnas" },
  { cols: 3, Icon: IconThree, label: "3 columnas" },
  { cols: 6, Icon: IconSix,   label: "6 columnas" },
];

export const GridLayoutSelector = ({ columns, onChange }: Props) => {
  return (
    <div className="flex items-center gap-1" aria-label="Cambiar vista del grid">
      {OPTIONS.map(({ cols, Icon, label }) => (
        <button
          key={cols}
          onClick={() => onChange(cols)}
          aria-label={label}
          aria-pressed={columns === cols}
          className={`p-2 transition-colors ${
            columns === cols
              ? "text-kyzz-dark"
              : "text-kyzz-muted hover:text-kyzz-dark"
          }`}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
};
