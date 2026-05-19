"use client";

import type { Columns } from "./ProductGrid";
export type { Columns };

interface Props {
  columns:   Columns;
  onChange:  (cols: Columns) => void;
  isMobile?: boolean;
}

// SVG icons inline — no external dependency
const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1.5" width="14" height="2.5" rx="0.5" />
    <rect x="1" y="6.5" width="14" height="2.5" rx="0.5" />
    <rect x="1" y="11.5" width="14" height="2.5" rx="0.5" />
  </svg>
);

const IconTwo = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="6" height="14" rx="0.5" />
    <rect x="9" y="1" width="6" height="14" rx="0.5" />
  </svg>
);

const IconThree = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1"    y="1" width="3.5" height="14" rx="0.5" />
    <rect x="6.25" y="1" width="3.5" height="14" rx="0.5" />
    <rect x="11.5" y="1" width="3.5" height="14" rx="0.5" />
  </svg>
);

const IconFour = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1"    y="1" width="2.5" height="14" rx="0.5" />
    <rect x="4.5"  y="1" width="2.5" height="14" rx="0.5" />
    <rect x="9"    y="1" width="2.5" height="14" rx="0.5" />
    <rect x="12.5" y="1" width="2.5" height="14" rx="0.5" />
  </svg>
);

const IconFive = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1"     y="1" width="2" height="14" rx="0.5" />
    <rect x="3.75"  y="1" width="2" height="14" rx="0.5" />
    <rect x="7"     y="1" width="2" height="14" rx="0.5" />
    <rect x="10.25" y="1" width="2" height="14" rx="0.5" />
    <rect x="13"    y="1" width="2" height="14" rx="0.5" />
  </svg>
);

const IconSix = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1"    y="1" width="1.5" height="14" rx="0.5" />
    <rect x="3.3"  y="1" width="1.5" height="14" rx="0.5" />
    <rect x="5.6"  y="1" width="1.5" height="14" rx="0.5" />
    <rect x="7.9"  y="1" width="1.5" height="14" rx="0.5" />
    <rect x="10.2" y="1" width="1.5" height="14" rx="0.5" />
    <rect x="12.5" y="1" width="1.5" height="14" rx="0.5" />
  </svg>
);

// Ícono portrait: un solo rectángulo vertical ancho (1 columna full-width)
const IconOneCol = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="1" width="12" height="14" rx="0.5" />
  </svg>
);

const ALL_OPTIONS: { cols: Columns; Icon: React.FC; label: string }[] = [
  { cols: 1, Icon: IconList,   label: "Vista de lista" },
  { cols: 2, Icon: IconTwo,    label: "2 columnas" },
  { cols: 3, Icon: IconThree,  label: "3 columnas" },
  { cols: 4, Icon: IconFour,   label: "4 columnas" },
  { cols: 5, Icon: IconFive,   label: "5 columnas" },
  { cols: 6, Icon: IconSix,    label: "6 columnas" },
];

// Mobile: Lista · 1col portrait · 2col · 3col
const MOBILE_OPTIONS: { cols: Columns; Icon: React.FC; label: string }[] = [
  { cols: 1, Icon: IconList,   label: "Vista de lista" },
  { cols: 0, Icon: IconOneCol, label: "1 columna" },
  { cols: 2, Icon: IconTwo,    label: "2 columnas" },
  { cols: 3, Icon: IconThree,  label: "3 columnas" },
];

export const GridLayoutSelector = ({ columns, onChange, isMobile = false }: Props) => {
  const options = isMobile ? MOBILE_OPTIONS : ALL_OPTIONS;

  return (
    <div className="flex items-center gap-0.5" aria-label="Cambiar vista">
      {options.map(({ cols, Icon, label }) => (
        <button
          key={cols}
          onClick={() => onChange(cols)}
          aria-label={label}
          aria-pressed={columns === cols}
          className={`p-2 transition-colors ${
            columns === cols
              ? "text-kyzz-dark"
              : "text-kyzz-secondary hover:text-kyzz-muted"
          }`}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
};
