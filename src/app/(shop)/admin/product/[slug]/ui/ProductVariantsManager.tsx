'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { Size } from '@prisma/client';
import { updateProductVariants, type VariantInput } from '@/actions';
import { IoSaveOutline, IoRefreshOutline } from 'react-icons/io5';

const ALL_SIZES: Size[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

interface ColorOption {
  id:   string;
  name: string;
  hex:  string;
}

interface InitialVariant {
  id:      string;
  colorId: string | null;
  size:    Size;
  stock:   number;
  sku:     string | null;
}

interface Props {
  productId:       string;
  colors:          ColorOption[];
  initialVariants: InitialVariant[];
}

interface Cell {
  id?:    string;
  stock:  number;
  active: boolean;
  sku:    string;
}

type RowKey = string | 'no-color';

// Celda vacía usada como fallback durante el frame entre prop-change y useEffect
const EMPTY_CELL: Cell = { stock: 0, active: false, sku: '' };

// Acceso defensivo: nunca lanza aunque matrix[rowKey] sea undefined
const safeRow  = (matrix: Record<RowKey, Record<Size, Cell>>, rowKey: RowKey) =>
  matrix[rowKey] ?? ({} as Record<Size, Cell>);
const getCell  = (matrix: Record<RowKey, Record<Size, Cell>>, rowKey: RowKey, size: Size): Cell =>
  matrix[rowKey]?.[size] ?? EMPTY_CELL;

export const ProductVariantsManager = ({ productId, colors, initialVariants }: Props) => {

  const rows: { key: RowKey; label: string; hex: string | null; colorId: string | null }[] =
    colors.length > 0
      ? colors.map((c) => ({ key: c.id, label: c.name, hex: c.hex, colorId: c.id }))
      : [{ key: 'no-color', label: 'Sin color', hex: null, colorId: null }];

  const buildInitialMatrix = (): Record<RowKey, Record<Size, Cell>> => {
    const m: Record<RowKey, Record<Size, Cell>> = {} as never;
    for (const row of rows) {
      m[row.key] = {} as Record<Size, Cell>;
      for (const size of ALL_SIZES) {
        const existing = initialVariants.find(
          (v) => (v.colorId ?? null) === row.colorId && v.size === size
        );
        m[row.key][size] = existing
          ? { id: existing.id, stock: existing.stock, active: true, sku: existing.sku ?? '' }
          : { stock: 0, active: false, sku: '' };
      }
    }
    return m;
  };

  const [matrix, setMatrix]          = useState(buildInitialMatrix);
  const [isPending, startTransition] = useTransition();
  const [dirty, setDirty]            = useState(false);
  const [fillAll, setFillAll]        = useState<{ rowKey: RowKey; value: string } | null>(null);

  // Resincronizar matrix cuando colors cambia (add/remove color)
  const colorsFingerprint = colors.map(c => c.id).join('|');
  useEffect(() => {
    setMatrix(buildInitialMatrix());
    setDirty(false);
    setFillAll(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorsFingerprint]);

  // Tallas con al menos una variante activa
  const visibleSizes = useMemo(() => {
    const active = new Set<Size>();
    for (const row of rows) {
      for (const size of ALL_SIZES) {
        if (getCell(matrix, row.key, size).active) active.add(size);
      }
    }
    return active.size > 0 ? ALL_SIZES.filter((s) => active.has(s)) : ALL_SIZES.slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrix]);

  const hiddenSizes = ALL_SIZES.filter((s) => !visibleSizes.includes(s));

  const toggleCell = (rowKey: RowKey, size: Size) => {
    setMatrix((prev) => {
      const row  = safeRow(prev, rowKey);
      const cell = row[size] ?? EMPTY_CELL;
      return { ...prev, [rowKey]: { ...row, [size]: { ...cell, active: !cell.active } } };
    });
    setDirty(true);
  };

  const updateStock = (rowKey: RowKey, size: Size, value: number) => {
    setMatrix((prev) => {
      const row  = safeRow(prev, rowKey);
      const cell = row[size] ?? EMPTY_CELL;
      return { ...prev, [rowKey]: { ...row, [size]: { ...cell, stock: Math.max(0, value), active: true } } };
    });
    setDirty(true);
  };

  const updateSku = (rowKey: RowKey, size: Size, value: string) => {
    setMatrix((prev) => {
      const row  = safeRow(prev, rowKey);
      const cell = row[size] ?? EMPTY_CELL;
      return { ...prev, [rowKey]: { ...row, [size]: { ...cell, sku: value } } };
    });
    setDirty(true);
  };

  const addSize = (size: Size) => {
    setMatrix((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        const rowData = safeRow(prev, row.key);
        const cell    = rowData[size] ?? EMPTY_CELL;
        next[row.key] = { ...rowData, [size]: { ...cell, active: true } };
      }
      return next;
    });
    setDirty(true);
  };

  const fillAllInRow = (rowKey: RowKey, value: number) => {
    setMatrix((prev) => {
      const row  = safeRow(prev, rowKey);
      const next = { ...row };
      for (const size of visibleSizes) {
        const cell = row[size] ?? EMPTY_CELL;
        next[size] = { ...cell, stock: Math.max(0, value), active: true };
      }
      return { ...prev, [rowKey]: next };
    });
    setDirty(true);
  };

  const reset = () => { setMatrix(buildInitialMatrix()); setDirty(false); setFillAll(null); };

  const handleSave = () => {
    const variants: VariantInput[] = [];
    for (const row of rows) {
      for (const size of ALL_SIZES) {
        const cell = getCell(matrix, row.key, size);
        if (cell.active) {
          variants.push({
            id:      cell.id,
            colorId: row.colorId,
            size,
            stock:   cell.stock,
            sku:     cell.sku.trim() || null,
          });
        }
      }
    }

    if (variants.length === 0) {
      toast.error('Activa al menos una talla con stock');
      return;
    }

    startTransition(async () => {
      const res = await updateProductVariants({ productId, variants });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success('Variantes guardadas');
      setDirty(false);
    });
  };

  const totalStock = rows.reduce((sum, row) =>
    sum + visibleSizes.reduce((rSum, size) => {
      const cell = getCell(matrix, row.key, size);
      return rSum + (cell.active ? cell.stock : 0);
    }, 0)
  , 0);

  return (
    <div className="space-y-5">

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted">Inventario por variante</p>
          <p className="text-xs text-kyzz-muted mt-1">
            Activa cada combinación talla {colors.length > 0 ? '× color' : ''} disponible e indica su stock.
            <span className="block mt-0.5">Total acumulado: <span className="text-kyzz-dark font-medium">{totalStock} unidades</span></span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={reset}
              disabled={isPending}
              className="flex items-center gap-1 text-[11px] text-kyzz-muted hover:text-kyzz-dark px-2 py-1"
            >
              <IoRefreshOutline size={12} /> Descartar
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || isPending}
            className="flex items-center gap-1.5 text-[11px] tracking-wider uppercase px-3 py-2 bg-kyzz-dark text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-kyzz-primary transition-colors"
          >
            <IoSaveOutline size={12} />
            {isPending ? 'Guardando...' : 'Guardar inventario'}
          </button>
        </div>
      </div>

      {/* ── Matriz ── */}
      <div className="border border-kyzz-secondary overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-kyzz-neutral text-[10px] tracking-widest uppercase text-kyzz-muted">
            <tr>
              <th className="text-left px-3 py-2 border-b border-kyzz-secondary w-44">
                {colors.length > 0 ? 'Color' : 'Producto'}
              </th>
              {visibleSizes.map((s) => (
                <th key={s} className="px-2 py-2 border-b border-kyzz-secondary border-l border-l-kyzz-secondary">
                  {s}
                </th>
              ))}
              <th className="w-12 px-2 py-2 border-b border-l border-kyzz-secondary">Σ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowStock = visibleSizes.reduce((sum, size) => {
                const cell = getCell(matrix, row.key, size);
                return sum + (cell.active ? cell.stock : 0);
              }, 0);

              return (
                <tr key={row.key} className="border-b border-kyzz-secondary last:border-b-0">
                  <td className="px-3 py-2 align-middle">
                    <div className="flex items-center gap-2">
                      {row.hex && (
                        <span
                          className="w-4 h-4 rounded-full border border-kyzz-secondary ring-1 ring-inset ring-black/10 shrink-0"
                          style={{ backgroundColor: row.hex }}
                        />
                      )}
                      <span className="text-sm text-kyzz-dark">{row.label}</span>
                    </div>
                    {fillAll?.rowKey === row.key ? (
                      <div className="flex items-center gap-1 mt-1.5">
                        <input
                          type="number"
                          min={0}
                          autoFocus
                          value={fillAll.value}
                          onChange={(e) => setFillAll({ rowKey: row.key, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const n = parseInt(fillAll.value, 10);
                              if (!isNaN(n)) fillAllInRow(row.key, n);
                              setFillAll(null);
                            }
                            if (e.key === 'Escape') setFillAll(null);
                          }}
                          className="w-14 text-center text-[11px] py-0.5 border border-kyzz-primary bg-white text-kyzz-dark focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const n = parseInt(fillAll.value, 10);
                            if (!isNaN(n)) fillAllInRow(row.key, n);
                            setFillAll(null);
                          }}
                          className="text-[10px] tracking-wider uppercase text-white bg-kyzz-dark px-1.5 py-0.5 hover:bg-kyzz-primary transition-colors"
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => setFillAll(null)}
                          className="text-[10px] text-kyzz-muted hover:text-kyzz-dark"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setFillAll({ rowKey: row.key, value: '10' })}
                        className="mt-1 text-[10px] text-kyzz-muted hover:text-kyzz-primary"
                      >
                        Aplicar a todas
                      </button>
                    )}
                  </td>
                  {visibleSizes.map((size) => {
                    const cell = getCell(matrix, row.key, size);
                    return (
                      <td key={size} className="px-1.5 py-1.5 border-l border-kyzz-secondary align-middle">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            min={0}
                            value={cell.active ? cell.stock : ''}
                            placeholder={cell.active ? '' : '—'}
                            disabled={!cell.active}
                            onChange={(e) => updateStock(row.key, size, parseInt(e.target.value, 10) || 0)}
                            className={`w-full text-center text-sm py-1 border ${
                              cell.active
                                ? 'border-kyzz-secondary bg-white text-kyzz-dark'
                                : 'border-dashed border-kyzz-secondary bg-kyzz-neutral text-kyzz-muted'
                            } focus:outline-none focus:border-kyzz-primary`}
                          />
                          <button
                            type="button"
                            onClick={() => toggleCell(row.key, size)}
                            className={`text-[9px] tracking-wider uppercase ${
                              cell.active
                                ? 'text-red-400 hover:text-red-600'
                                : 'text-kyzz-muted hover:text-kyzz-primary'
                            }`}
                          >
                            {cell.active ? 'Quitar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 border-l border-kyzz-secondary text-center text-[11px] text-kyzz-muted tabular-nums">
                    {rowStock}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Agregar tallas adicionales ── */}
      {hiddenSizes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] tracking-widest uppercase text-kyzz-muted">Agregar talla:</span>
          {hiddenSizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addSize(s)}
              className="text-xs px-2.5 py-1 border border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-dark transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {colors.length === 0 && (
        <p className="text-[11px] text-kyzz-muted italic">
          Este producto no tiene colores asignados. Las variantes se crean por talla únicamente.
          Si agregas un color en la sección de arriba, aparecerá automáticamente en esta matriz.
        </p>
      )}
    </div>
  );
};
