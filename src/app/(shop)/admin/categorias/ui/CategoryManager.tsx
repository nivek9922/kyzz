'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { IoAddOutline, IoPencilOutline, IoTrashOutline, IoCheckmarkOutline, IoCloseOutline } from 'react-icons/io5';
import { createCategory, updateCategory, deleteCategory } from '@/actions';

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { Product: number };
}

interface Props {
  initialCategories: Category[];
}

export const CategoryManager = ({ initialCategories }: Props) => {
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName]       = useState('');
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editName, setEditName]     = useState('');
  const [creating, setCreating]     = useState(false);

  const slugPreview = (text: string) =>
    text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const id = toast.loading('Creando categoría...');
    const result = await createCategory(newName);
    if (result.ok && result.category) {
      setCategories(prev => [...prev, { ...result.category!, _count: { Product: 0 } }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      toast.success('Categoría creada', { id });
    } else {
      toast.error(result.message ?? 'Error', { id });
    }
    setCreating(false);
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleUpdate = async (id: string) => {
    const tid = toast.loading('Actualizando...');
    const result = await updateCategory(id, editName);
    if (result.ok && result.category) {
      setCategories(prev =>
        prev.map(c => c.id === id ? { ...c, name: result.category!.name, slug: result.category!.slug } : c)
            .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      toast.success('Categoría actualizada', { id: tid });
    } else {
      toast.error(result.message ?? 'Error', { id: tid });
    }
  };

  const handleDelete = async (cat: Category) => {
    if (cat._count.Product > 0) {
      toast.error(`No se puede eliminar: tiene ${cat._count.Product} producto(s) asignado(s)`);
      return;
    }
    const tid = toast.loading('Eliminando...');
    const result = await deleteCategory(cat.id);
    if (result.ok) {
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      toast.success('Categoría eliminada', { id: tid });
    } else {
      toast.error(result.message ?? 'Error', { id: tid });
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Crear nueva */}
      <div className="kyzz-panel p-6">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-5">Nueva categoría</p>
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <input
              className="kyzz-input"
              placeholder="Nombre de la categoría"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            {newName && (
              <p className="text-[10px] text-kyzz-muted tracking-wider">
                slug: <span className="font-mono text-kyzz-primary">{slugPreview(newName)}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="btn-primary flex items-center gap-2 shrink-0"
          >
            <IoAddOutline size={14} />
            Crear
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="border border-kyzz-secondary divide-y divide-kyzz-secondary">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[1fr_160px_80px_100px] gap-4 px-5 py-3 bg-kyzz-tertiary">
          {['Nombre', 'Slug', 'Productos', ''].map((h, i) => (
            <p key={i} className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted">{h}</p>
          ))}
        </div>

        {categories.length === 0 && (
          <p className="text-sm text-kyzz-muted text-center py-10">No hay categorías creadas</p>
        )}

        {categories.map(cat => (
          <div key={cat.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_160px_80px_100px] gap-4 items-center px-5 py-4">

            {/* Nombre / edit inline */}
            <div>
              {editingId === cat.id ? (
                <div className="space-y-1">
                  <input
                    autoFocus
                    className="kyzz-input text-sm"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleUpdate(cat.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  {editName && (
                    <p className="text-[10px] text-kyzz-muted tracking-wider">
                      slug: <span className="font-mono text-kyzz-primary">{slugPreview(editName)}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-medium text-kyzz-dark">{cat.name}</p>
              )}
            </div>

            {/* Slug */}
            <p className="hidden md:block text-[11px] font-mono text-kyzz-muted">{cat.slug}</p>

            {/* Conteo productos */}
            <p className="hidden md:block text-sm text-kyzz-muted">{cat._count.Product}</p>

            {/* Acciones */}
            <div className="flex items-center gap-2 justify-end md:justify-start">
              {editingId === cat.id ? (
                <>
                  <button onClick={() => handleUpdate(cat.id)} className="text-emerald-600 hover:text-emerald-700 transition-colors p-1">
                    <IoCheckmarkOutline size={16} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-kyzz-muted hover:text-kyzz-dark transition-colors p-1">
                    <IoCloseOutline size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleEdit(cat)} className="text-kyzz-muted hover:text-kyzz-dark transition-colors p-1" title="Editar">
                    <IoPencilOutline size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className={`transition-colors p-1 ${cat._count.Product > 0 ? 'text-kyzz-secondary cursor-not-allowed' : 'text-kyzz-muted hover:text-red-500'}`}
                    title={cat._count.Product > 0 ? `Tiene ${cat._count.Product} productos` : 'Eliminar'}
                  >
                    <IoTrashOutline size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
