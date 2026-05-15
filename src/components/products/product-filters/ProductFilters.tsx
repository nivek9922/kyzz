'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { IoCloseOutline, IoFunnelOutline } from 'react-icons/io5';
import type { ProductColor } from '@/actions/product/get-product-colors';
import { VALID_SIZES } from '@/config/constants';

const SIZES = VALID_SIZES;
const SORT_OPTIONS = [
  { value: 'newest',     label: 'Más reciente' },
  { value: 'price_asc',  label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
];

interface Category { name: string; slug: string; }

interface Props {
  categories: Category[];
  colors?:    ProductColor[];
}

export const ProductFilters = ({ categories, colors = [] }: Props) => {
  const router     = useRouter();
  const params     = useSearchParams();
  const [open, setOpen] = useState(false);

  // Estado actual desde URL
  const activeCategory = params.get('category') ?? '';
  const activeSizes    = params.get('sizes')?.split(',').filter(Boolean) ?? [];
  const minPrice       = params.get('min') ?? '';
  const maxPrice       = params.get('max') ?? '';
  const sortBy         = params.get('sort') ?? 'newest';
  const activeColors   = params.getAll('color');

  // Estados locales del drawer (sincronizados al abrir)
  const [localSizes,    setLocalSizes]    = useState<string[]>(activeSizes);
  const [localMin,      setLocalMin]      = useState(minPrice);
  const [localMax,      setLocalMax]      = useState(maxPrice);
  const [localSort,     setLocalSort]     = useState(sortBy);
  const [localCategory, setLocalCategory] = useState(activeCategory);
  const [localColors,   setLocalColors]   = useState<string[]>(activeColors);

  const activeCount = [
    activeCategory,
    activeSizes.length > 0 ? 'sizes' : '',
    minPrice || maxPrice ? 'price' : '',
    sortBy !== 'newest' ? 'sort' : '',
    activeColors.length > 0 ? 'color' : '',
  ].filter(Boolean).length;

  const applyFilters = useCallback(() => {
    const p = new URLSearchParams();
    if (localCategory) p.set('category', localCategory);
    if (localSizes.length > 0) p.set('sizes', localSizes.join(','));
    if (localMin) p.set('min', localMin);
    if (localMax) p.set('max', localMax);
    if (localSort !== 'newest') p.set('sort', localSort);
    localColors.forEach((c) => p.append('color', c));
    router.replace(`/products${p.toString() ? '?' + p.toString() : ''}`);
    setOpen(false);
  }, [localCategory, localSizes, localMin, localMax, localSort, localColors, router]);

  const clearFilters = () => {
    setLocalCategory('');
    setLocalSizes([]);
    setLocalMin('');
    setLocalMax('');
    setLocalSort('newest');
    setLocalColors([]);
    router.replace('/products');
    setOpen(false);
  };

  const toggleSize = (size: string) =>
    setLocalSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);

  const toggleColor = (colorName: string) =>
    setLocalColors(prev =>
      prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName],
    );

  const openDrawer = () => {
    setLocalCategory(activeCategory);
    setLocalSizes(activeSizes);
    setLocalMin(minPrice);
    setLocalMax(maxPrice);
    setLocalSort(sortBy);
    setLocalColors(activeColors);
    setOpen(true);
  };

  return (
    <>
      {/* Botón trigger */}
      <button
        onClick={openDrawer}
        className="flex items-center gap-2 btn-secondary relative"
      >
        <IoFunnelOutline size={13} />
        <span>Filtrar</span>
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-kyzz-primary text-white text-[9px] flex items-center justify-center font-medium">
            {activeCount}
          </span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-kyzz-dark/40 z-40 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer lateral */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-kyzz-neutral border-l border-kyzz-secondary z-50 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header del drawer */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-kyzz-secondary">
          <p className="text-[11px] tracking-[0.25em] uppercase text-kyzz-dark">Filtros</p>
          <button onClick={() => setOpen(false)} className="text-kyzz-muted hover:text-kyzz-dark transition-colors">
            <IoCloseOutline size={20} />
          </button>
        </div>

        {/* Cuerpo del drawer */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

          {/* Categoría */}
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted mb-3">Categoría</p>
            <div className="space-y-1">
              <button
                onClick={() => setLocalCategory('')}
                className={`w-full text-left text-sm py-1.5 transition-colors ${!localCategory ? 'text-kyzz-dark font-medium' : 'text-kyzz-muted hover:text-kyzz-dark'}`}
              >
                Todas
              </button>
              {categories.map(cat => (
                <button
                  key={cat.slug}
                  onClick={() => setLocalCategory(cat.slug)}
                  className={`w-full text-left text-sm py-1.5 transition-colors ${localCategory === cat.slug ? 'text-kyzz-dark font-medium' : 'text-kyzz-muted hover:text-kyzz-dark'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tallas */}
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted mb-3">Talla</p>
            <div className="flex flex-wrap gap-2">
              {SIZES.map(size => (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`px-3 py-1.5 text-[11px] tracking-widest uppercase border transition-colors ${
                    localSizes.includes(size)
                      ? 'border-kyzz-dark bg-kyzz-dark text-white'
                      : 'border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          {colors.length > 0 && (
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted mb-3">Color</p>
              <div className="space-y-1">
                {colors.map((c) => {
                  const active = localColors.includes(c.colorName);
                  return (
                    <button
                      key={c.colorName}
                      onClick={() => toggleColor(c.colorName)}
                      className={`w-full flex items-center gap-3 px-2 py-1.5 transition-colors text-left ${
                        active ? 'bg-kyzz-secondary/50' : 'hover:bg-kyzz-secondary/30'
                      }`}
                    >
                      <span
                        className={`relative shrink-0 w-5 h-5 rounded-full transition-all duration-200 ${
                          active
                            ? 'ring-2 ring-offset-1 ring-kyzz-dark scale-110'
                            : 'ring-1 ring-kyzz-secondary'
                        }`}
                        style={{ backgroundColor: c.colorHex }}
                      >
                        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10" />
                      </span>
                      <span className={`text-sm flex-1 ${active ? 'text-kyzz-dark font-medium' : 'text-kyzz-muted'}`}>
                        {c.colorName}
                      </span>
                      <span className="text-[11px] text-kyzz-muted tabular-nums">({c.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Precio */}
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted mb-3">Precio (COP)</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="Mín"
                value={localMin}
                onChange={e => setLocalMin(e.target.value)}
                className="kyzz-input text-sm w-full"
                min={0}
              />
              <span className="text-kyzz-muted text-sm shrink-0">—</span>
              <input
                type="number"
                placeholder="Máx"
                value={localMax}
                onChange={e => setLocalMax(e.target.value)}
                className="kyzz-input text-sm w-full"
                min={0}
              />
            </div>
          </div>

          {/* Ordenar */}
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted mb-3">Ordenar por</p>
            <div className="space-y-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLocalSort(opt.value)}
                  className={`w-full text-left text-sm py-1.5 transition-colors ${localSort === opt.value ? 'text-kyzz-dark font-medium' : 'text-kyzz-muted hover:text-kyzz-dark'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer del drawer */}
        <div className="px-6 py-5 border-t border-kyzz-secondary flex gap-3">
          <button onClick={clearFilters} className="flex-1 btn-secondary text-center">
            Limpiar
          </button>
          <button onClick={applyFilters} className="flex-1 btn-primary">
            Aplicar
          </button>
        </div>
      </div>
    </>
  );
};
