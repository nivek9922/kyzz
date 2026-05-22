'use client';

import { useState, useTransition, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  IoAddOutline, IoTrashOutline, IoImageOutline, IoCloseOutline,
  IoWarningOutline,
} from 'react-icons/io5';
import {
  addProductColor, removeProductColor, addColorImage, removeColorImage,
  convertProductToNoColor,
} from '@/actions';
import { useRouter } from 'next/navigation';
import type { ColorPalette } from '@prisma/client';

const imgSrc = (url: string) => url.startsWith('http') ? url : `/products/${url}`;

export interface ColorImageData {
  id: string;
  url: string;
  sortOrder: number;
}

export interface ProductColorData {
  id: string;
  paletteColorId: string;
  paletteColor: { id: string; name: string; hex: string };
  images: ColorImageData[];
}

interface Props {
  productId:       string;
  productSlug:     string;
  palette:         ColorPalette[];
  initialColors:   ProductColorData[];
  hasDirectImages?: boolean;
}

export const ProductColorsManager = ({
  productId, productSlug, palette, initialColors, hasDirectImages = false,
}: Props) => {
  const router = useRouter();
  const [colors, setColors]             = useState<ProductColorData[]>(initialColors);
  const [adding, setAdding]             = useState(false);
  const [selectedPaletteId, setSelectedPaletteId] = useState('');
  const [newImages, setNewImages]       = useState<File[]>([]);
  const [previews, setPreviews]         = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId]       = useState<string | null>(null);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [isPending, startTransition]    = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleConvertToNoColor = () => {
    startTransition(async () => {
      const res = await convertProductToNoColor(productId);
      if (!res.ok) { toast.error(res.error ?? 'Error al convertir el producto'); return; }
      toast.success('Producto convertido a sin color');
      setColors([]);
      setShowConvertConfirm(false);
      router.refresh();
    });
  };

  // Productos con imágenes directas SIN colores asignados = no permiten colores
  const isLegacyProduct = hasDirectImages && colors.length === 0;

  const availablePalette = palette.filter(
    (p) => !colors.some((c) => c.paletteColorId === p.id)
  );

  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    previews.forEach(URL.revokeObjectURL);
    setNewImages(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const handleAddColor = () => {
    if (!selectedPaletteId) { toast.error('Selecciona un color de la paleta'); return; }
    if (newImages.length === 0) { toast.error('Debes subir al menos una imagen para este color'); return; }

    startTransition(async () => {
      const fd = new FormData();
      fd.append('productId',      productId);
      fd.append('paletteColorId', selectedPaletteId);
      newImages.forEach((img) => fd.append('images', img));

      const res = await addProductColor(fd);
      if (!res.ok) { toast.error(res.error); return; }

      const pal = palette.find((p) => p.id === selectedPaletteId)!;
      const newColor: ProductColorData = {
        id:             res.productColorId!,
        paletteColorId: selectedPaletteId,
        paletteColor:   { id: pal.id, name: pal.name, hex: pal.hex },
        images:         res.images ?? [],
      };
      setColors((prev) => [...prev, newColor]);
      toast.success(`Color "${pal.name}" agregado`);
      setAdding(false);
      setSelectedPaletteId('');
      setNewImages([]);
      setPreviews([]);
      if (fileRef.current) fileRef.current.value = '';
    });
  };

  const handleRemoveColor = (colorId: string) => {
    // Advertir si es el último color y el producto no tiene imágenes generales
    const isLastColor = colors.length === 1;
    if (isLastColor && !hasDirectImages) {
      toast.warning(
        'Al eliminar el último color el producto quedará sin imágenes. Sube imágenes generales primero o añade otro color.',
        { duration: 5000 }
      );
      setConfirmDeleteId(null);
      return;
    }

    startTransition(async () => {
      const res = await removeProductColor(colorId);
      if (!res.ok) { toast.error(res.error); return; }
      setColors((prev) => prev.filter((c) => c.id !== colorId));
      setConfirmDeleteId(null);
      toast.success('Color eliminado');
    });
  };

  const handleAddImage = (colorId: string, file: File) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append('productColorId', colorId);
      fd.append('image',          file);
      const res = await addColorImage(fd);
      if (!res.ok) { toast.error(res.error); return; }
      setColors((prev) => prev.map((c) =>
        c.id === colorId
          ? { ...c, images: [...c.images, res.image!] }
          : c
      ));
      toast.success('Imagen agregada');
    });
  };

  const handleRemoveImage = (colorId: string, imageId: string) => {
    startTransition(async () => {
      const res = await removeColorImage(imageId);
      if (!res.ok) { toast.error(res.error); return; }
      setColors((prev) => prev.map((c) =>
        c.id === colorId
          ? { ...c, images: c.images.filter((i) => i.id !== imageId) }
          : c
      ));
      toast.success('Imagen eliminada');
    });
  };

  // ── Producto con imágenes directas (sin colores) ──────────────────────────────
  if (isLegacyProduct) {
    return (
      <div className="flex items-start gap-3 p-4 border border-kyzz-secondary bg-kyzz-neutral">
        <IoWarningOutline size={16} className="text-kyzz-muted shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-kyzz-dark font-medium">Este producto usa imágenes directas</p>
          <p className="text-xs text-kyzz-muted mt-0.5 leading-relaxed">
            Para mantener consistencia, los productos con imágenes directas no pueden tener variantes de color.
            Los nuevos productos con colores se crean sin imágenes en la sección de imágenes de arriba.
          </p>
        </div>
      </div>
    );
  }

  // ── Manager de colores ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted">
          Colores del producto ({colors.length})
        </p>
        <div className="flex items-center gap-4">
          {!adding && !showConvertConfirm && availablePalette.length > 0 && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs text-kyzz-primary hover:text-kyzz-dark transition-colors"
            >
              <IoAddOutline size={14} /> Agregar color
            </button>
          )}
          {!adding && !showConvertConfirm && colors.length > 0 && (
            <button
              type="button"
              onClick={() => setShowConvertConfirm(true)}
              className="text-[10px] text-kyzz-muted hover:text-red-500 underline transition-colors"
            >
              Convertir a sin color
            </button>
          )}
        </div>
      </div>

      {showConvertConfirm && (
        <div className="border border-red-200 bg-red-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <IoWarningOutline size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-kyzz-dark font-medium">Convertir a producto sin color</p>
              <p className="text-xs text-kyzz-muted mt-1 leading-relaxed">
                Esto eliminará <strong>todos los colores</strong>, sus imágenes y sus variantes de inventario asociadas.
                El producto pasará a modo sin color y podrás gestionar su galería general y tallas desde las secciones correspondientes.
                <br /><strong className="text-red-500">Esta acción no se puede deshacer.</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowConvertConfirm(false)}
              disabled={isPending}
              className="text-xs text-kyzz-muted hover:text-kyzz-dark transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConvertToNoColor}
              disabled={isPending}
              className="text-xs text-red-500 hover:text-red-700 font-medium border border-red-200 px-3 py-1.5 hover:bg-red-100 transition-colors"
            >
              {isPending ? 'Convirtiendo...' : 'Sí, convertir a sin color'}
            </button>
          </div>
        </div>
      )}

      {/* ── Form de nuevo color ── */}
      {adding && (
        <div className="border border-kyzz-secondary p-4 space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-xs text-kyzz-dark">Nuevo color</p>
            <button
              onClick={() => {
                setAdding(false);
                setSelectedPaletteId('');
                setNewImages([]);
                setPreviews([]);
              }}
              className="text-kyzz-muted hover:text-kyzz-dark"
            >
              <IoCloseOutline size={16} />
            </button>
          </div>

          {/* Selector de paleta */}
          <div>
            <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-2">Color de la paleta</p>
            <div className="flex flex-wrap gap-2">
              {availablePalette.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPaletteId(p.id)}
                  title={p.name}
                  className={`flex items-center gap-2 px-3 py-1.5 border text-xs transition-all ${
                    selectedPaletteId === p.id
                      ? 'border-kyzz-dark bg-kyzz-dark text-white'
                      : 'border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-kyzz-secondary ring-1 ring-inset ring-black/10 shrink-0"
                    style={{ backgroundColor: p.hex }}
                  />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Imágenes — requeridas */}
          <div>
            <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-1">
              Imágenes de este color <span className="text-red-400 normal-case">* requerido</span>
            </p>
            <p className="text-[10px] text-kyzz-muted mb-2">
              Se subirán a Cloudinary. Puedes agregar más imágenes después.
            </p>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/png, image/jpeg, image/jpg, image/webp, image/avif"
              onChange={handleNewImageChange}
              className="kyzz-input text-sm w-full"
            />
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {previews.map((url, i) => (
                  <div key={i} className="relative aspect-[3/4] bg-kyzz-tertiary overflow-hidden">
                    <Image src={url} alt={`preview-${i}`} fill sizes="(max-width: 768px) 33vw, 150px" className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddColor}
            disabled={!selectedPaletteId || newImages.length === 0 || isPending}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Subiendo imágenes...' : 'Agregar color'}
          </button>
        </div>
      )}

      {/* ── Sin colores aún ── */}
      {colors.length === 0 && !adding && (
        <p className="text-sm text-kyzz-muted py-4 text-center border border-dashed border-kyzz-secondary">
          Este producto no tiene variantes de color.
        </p>
      )}

      {/* ── Lista de colores existentes ── */}
      <div className="space-y-4">
        {colors.map((color) => (
          <div key={color.id} className="border border-kyzz-secondary">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-kyzz-secondary bg-kyzz-neutral">
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full border border-kyzz-secondary ring-1 ring-inset ring-black/10"
                  style={{ backgroundColor: color.paletteColor.hex }}
                />
                <p className="text-sm text-kyzz-dark">{color.paletteColor.name}</p>
                <p className="text-[11px] text-kyzz-muted">
                  {color.images.length} imagen{color.images.length !== 1 ? 'es' : ''}
                </p>
                {color.images.length === 0 && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 border border-amber-200">
                    sin imágenes
                  </span>
                )}
              </div>

              {/* Confirmación inline en lugar de confirm() */}
              {confirmDeleteId === color.id ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-kyzz-muted">¿Eliminar este color?</span>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={isPending}
                    className="text-xs text-kyzz-muted hover:text-kyzz-dark underline"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(color.id)}
                    disabled={isPending}
                    className="text-xs text-red-500 hover:text-red-700 font-medium underline"
                  >
                    {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(color.id)}
                  disabled={isPending}
                  className="text-kyzz-muted hover:text-red-500 transition-colors p-1"
                >
                  <IoTrashOutline size={15} />
                </button>
              )}
            </div>

            {/* Imágenes del color */}
            <div className="p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {color.images.map((img) => (
                  <div key={img.id} className="relative group">
                    <div className="relative aspect-[3/4] bg-kyzz-tertiary overflow-hidden">
                      <Image
                        src={imgSrc(img.url)}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="150px"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(color.id, img.id)}
                      disabled={isPending}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <IoCloseOutline size={11} />
                    </button>
                  </div>
                ))}

                {/* Botón agregar imagen */}
                <label className="relative aspect-[3/4] border border-dashed border-kyzz-secondary flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-kyzz-primary hover:bg-kyzz-neutral transition-colors">
                  <IoImageOutline size={20} className="text-kyzz-muted" />
                  <span className="text-[10px] text-kyzz-muted tracking-wider uppercase">Agregar</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/avif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAddImage(color.id, file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
