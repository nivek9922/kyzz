'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { IoAddOutline, IoTrashOutline, IoPencilOutline, IoCheckmarkOutline, IoCloseOutline } from 'react-icons/io5';
import { createPaletteColor, updatePaletteColor, deletePaletteColor } from '@/actions';
import type { ColorPalette } from '@prisma/client';

interface Props { initialColors: ColorPalette[]; }

export const ColorPaletteManager = ({ initialColors }: Props) => {
  const [colors, setColors]             = useState(initialColors);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [isPending, startTransition]    = useTransition();

  const [name,      setName]      = useState('');
  const [hex,       setHex]       = useState('#F5ECD7');
  const [sortOrder, setSortOrder] = useState(0);

  const resetForm = () => {
    setName(''); setHex('#F5ECD7'); setSortOrder(0);
    setEditingId(null); setShowAdd(false);
  };

  const handleAdd = () => {
    startTransition(async () => {
      const res = await createPaletteColor({ name: name.trim(), hex, sortOrder });
      if (!res.ok) { toast.error(res.error); return; }
      setColors(prev => [...prev, res.color!].sort((a, b) => a.sortOrder - b.sortOrder));
      toast.success(`Color "${name}" agregado`);
      resetForm();
    });
  };

  const handleUpdate = (id: string) => {
    startTransition(async () => {
      const res = await updatePaletteColor({ id, name: name.trim(), hex, sortOrder });
      if (!res.ok) { toast.error(res.error); return; }
      setColors(prev => prev.map(c => c.id === id ? res.color! : c).sort((a, b) => a.sortOrder - b.sortOrder));
      toast.success('Color actualizado');
      resetForm();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deletePaletteColor(id);
      if (!res.ok) { toast.error(res.error); return; }
      setColors(prev => prev.filter(c => c.id !== id));
      setConfirmDeleteId(null);
      toast.success('Color eliminado');
    });
  };

  const startEdit = (c: ColorPalette) => {
    setEditingId(c.id); setName(c.name); setHex(c.hex); setSortOrder(c.sortOrder);
    setShowAdd(false); setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6">

      {/* Lista de colores */}
      <div className="border border-kyzz-secondary divide-y divide-kyzz-secondary">
        {colors.length === 0 && (
          <p className="px-6 py-8 text-sm text-kyzz-muted text-center">No hay colores en la paleta.</p>
        )}
        {colors.map((c) => (
          <div key={c.id} className="px-6 py-4">
            {editingId === c.id ? (
              <InlineForm
                name={name} hex={hex} sortOrder={sortOrder}
                onName={setName} onHex={setHex} onSort={setSortOrder}
                onSave={() => handleUpdate(c.id)}
                onCancel={resetForm}
                loading={isPending}
              />
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full border border-kyzz-secondary ring-1 ring-inset ring-black/10 shrink-0"
                    style={{ backgroundColor: c.hex }}
                  />
                  <div>
                    <p className="text-sm text-kyzz-dark">{c.name}</p>
                    <p className="text-[11px] text-kyzz-muted font-mono">{c.hex} · orden {c.sortOrder}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {confirmDeleteId === c.id ? (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-kyzz-muted">¿Eliminar?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        disabled={isPending}
                        className="text-red-500 hover:text-red-700 font-medium underline disabled:opacity-50"
                      >
                        {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-kyzz-muted hover:text-kyzz-dark"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(c)}
                        className="p-1.5 text-kyzz-muted hover:text-kyzz-dark transition-colors"
                        title="Editar"
                      >
                        <IoPencilOutline size={16} />
                      </button>
                      <button
                        onClick={() => { setConfirmDeleteId(c.id); setEditingId(null); }}
                        className="p-1.5 text-kyzz-muted hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <IoTrashOutline size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Agregar nuevo */}
      {showAdd ? (
        <div className="border border-kyzz-secondary p-6">
          <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted mb-4">Nuevo color</p>
          <InlineForm
            name={name} hex={hex} sortOrder={sortOrder}
            onName={setName} onHex={setHex} onSort={setSortOrder}
            onSave={handleAdd}
            onCancel={resetForm}
            loading={isPending}
          />
        </div>
      ) : (
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); resetForm(); }}
          className="flex items-center gap-2 text-sm text-kyzz-primary hover:text-kyzz-dark transition-colors"
        >
          <IoAddOutline size={16} />
          Agregar color
        </button>
      )}
    </div>
  );
};

interface FormProps {
  name: string; hex: string; sortOrder: number;
  onName: (v: string) => void; onHex: (v: string) => void; onSort: (v: number) => void;
  onSave: () => void; onCancel: () => void; loading: boolean;
}

const InlineForm = ({ name, hex, sortOrder, onName, onHex, onSort, onSave, onCancel, loading }: FormProps) => (
  <div className="flex flex-wrap items-end gap-3">
    <div className="flex-1 min-w-[160px]">
      <label className="block text-[10px] tracking-widest uppercase text-kyzz-muted mb-1">Nombre</label>
      <input
        value={name}
        onChange={e => onName(e.target.value)}
        placeholder="Ej: Rosa palo"
        className="kyzz-input text-sm w-full"
      />
    </div>
    <div>
      <label className="block text-[10px] tracking-widest uppercase text-kyzz-muted mb-1">Color</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={e => onHex(e.target.value)}
          className="w-10 h-9 cursor-pointer rounded border border-kyzz-secondary bg-transparent p-0.5"
        />
        <input
          value={hex}
          onChange={e => onHex(e.target.value)}
          placeholder="#F5ECD7"
          className="kyzz-input text-sm font-mono w-28"
          maxLength={7}
        />
      </div>
    </div>
    <div className="w-20">
      <label className="block text-[10px] tracking-widest uppercase text-kyzz-muted mb-1">Orden</label>
      <input
        type="number"
        value={sortOrder}
        onChange={e => onSort(parseInt(e.target.value) || 0)}
        className="kyzz-input text-sm w-full"
        min={0}
      />
    </div>
    <div className="flex gap-2">
      <button
        onClick={onSave}
        disabled={!name.trim() || loading}
        className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
      >
        <IoCheckmarkOutline size={14} />
        Guardar
      </button>
      <button onClick={onCancel} className="btn-secondary flex items-center gap-1.5">
        <IoCloseOutline size={14} />
        Cancelar
      </button>
    </div>
  </div>
);
