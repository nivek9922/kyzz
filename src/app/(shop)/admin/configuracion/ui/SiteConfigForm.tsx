'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { IoCloudUploadOutline, IoTrashOutline } from 'react-icons/io5';
import { updateSiteConfig } from '@/actions';

interface Props {
  config: {
    heroTitle: string;
    heroSubtitle: string;
    heroCta: string;
    heroImageUrl: string | null;
  };
}

export const SiteConfigForm = ({ config }: Props) => {
  const [heroTitle, setHeroTitle]       = useState(config.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(config.heroSubtitle);
  const [heroCta, setHeroCta]           = useState(config.heroCta);
  const [imagePreview, setImagePreview] = useState<string | null>(config.heroImageUrl);
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [saving, setSaving]             = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const id = toast.loading('Guardando configuración...');

    try {
      const formData = new FormData();
      formData.append('heroTitle', heroTitle);
      formData.append('heroSubtitle', heroSubtitle);
      formData.append('heroCta', heroCta);
      if (imageFile) formData.append('heroImage', imageFile);
      if (config.heroImageUrl) formData.append('currentHeroImageUrl', config.heroImageUrl);

      const result = await updateSiteConfig(formData);

      if (result.ok) {
        toast.success('Configuración guardada', {
          id,
          description: 'La página principal se actualizará en breve',
        });
      } else {
        toast.error(result.message ?? 'Error al guardar', { id });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">

      {/* Textos del hero */}
      <div className="space-y-6">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted">Textos del banner principal</p>

        <div>
          <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-2">
            Etiqueta superior
          </label>
          <input
            className="kyzz-input"
            value={heroSubtitle}
            onChange={e => setHeroSubtitle(e.target.value)}
            placeholder="Ej: Nueva colección"
          />
        </div>

        <div>
          <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-2">
            Título principal
          </label>
          <input
            className="kyzz-input"
            value={heroTitle}
            onChange={e => setHeroTitle(e.target.value)}
            placeholder="Ej: Kyzz: Basics for every you"
          />
        </div>

        <div>
          <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-2">
            Texto del botón
          </label>
          <input
            className="kyzz-input"
            value={heroCta}
            onChange={e => setHeroCta(e.target.value)}
            placeholder="Ej: Explorar colección"
          />
        </div>
      </div>

      {/* Imagen hero */}
      <div className="space-y-4">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted">
          Imagen de fondo — opcional
        </p>
        <p className="text-xs text-kyzz-muted leading-relaxed">
          Foto editorial horizontal, mínimo 1920×600px. Tonos neutros que encajen con la paleta KYZZ.
          Sin imagen se muestra el banner de marca con la K animada.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleImageChange}
        />

        {imagePreview ? (
          <div className="relative w-full aspect-[16/5] overflow-hidden bg-kyzz-tertiary border border-kyzz-secondary">
            <Image
              src={imagePreview}
              alt="Hero preview"
              fill
              className="object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-3 right-3 bg-white/90 hover:bg-white text-kyzz-dark p-1.5 border border-kyzz-secondary transition-colors"
            >
              <IoTrashOutline size={14} />
            </button>
            {imageFile && (
              <span className="absolute bottom-3 left-3 text-[10px] tracking-widest uppercase bg-kyzz-dark text-white px-2 py-1">
                Nueva imagen
              </span>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border border-dashed border-kyzz-secondary hover:border-kyzz-primary transition-colors flex flex-col items-center justify-center gap-3 py-12 text-kyzz-muted hover:text-kyzz-primary"
          >
            <IoCloudUploadOutline size={28} />
            <span className="text-[11px] tracking-widest uppercase">Subir imagen</span>
            <span className="text-xs">JPG, PNG, WebP · Máx recomendado 4 MB</span>
          </button>
        )}

        {imagePreview && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
          >
            Cambiar imagen
          </button>
        )}
      </div>

      <div className="pt-2 justify-center flex">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

    </form>
  );
};
