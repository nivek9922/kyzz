'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { IoCloudUploadOutline, IoTrashOutline, IoVideocamOutline } from 'react-icons/io5';
import { updateSiteConfig, getCloudinaryVideoSignature, saveHeroVideo } from '@/actions';

interface Props {
  config: {
    heroTitle:          string;
    heroSubtitle:       string;
    heroCta:            string;
    heroImageUrl:       string | null;
    heroVideoUrl:       string | null;
    heroPosterUrl:      string | null;
    brandStoryImageUrl: string | null;
    brandStoryText:     string | null;
  };
}

export const SiteConfigForm = ({ config }: Props) => {
  const [heroTitle, setHeroTitle]       = useState(config.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(config.heroSubtitle);
  const [heroCta, setHeroCta]           = useState(config.heroCta);
  const [imagePreview, setImagePreview] = useState<string | null>(config.heroImageUrl);
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [saving, setSaving]             = useState(false);
  const [videoUrl,       setVideoUrl]       = useState<string | null>(config.heroVideoUrl ?? null);
  const [posterUrl,      setPosterUrl]      = useState<string | null>(config.heroPosterUrl ?? null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [brandText,         setBrandText]         = useState(config.brandStoryText ?? '');
  const [brandImagePreview, setBrandImagePreview] = useState<string | null>(config.brandStoryImageUrl);
  const [brandImageFile,    setBrandImageFile]    = useState<File | null>(null);
  const fileRef          = useRef<HTMLInputElement>(null);
  const videoFileRef     = useRef<HTMLInputElement>(null);
  const brandImageRef    = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleBrandImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (brandImagePreview?.startsWith('blob:')) URL.revokeObjectURL(brandImagePreview);
    setBrandImageFile(file);
    setBrandImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveBrandImage = () => {
    if (brandImagePreview?.startsWith('blob:')) URL.revokeObjectURL(brandImagePreview);
    setBrandImageFile(null);
    setBrandImagePreview(null);
    if (brandImageRef.current) brandImageRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (imageFile && imageFile.size > 4 * 1024 * 1024) {
      const mb = (imageFile.size / 1024 / 1024).toFixed(1);
      toast.error(`La imagen pesa ${mb} MB — máximo permitido: 4 MB`, {
        description: 'Comprime la imagen en tinypng.com o reduce su resolución antes de subirla.',
        duration: 6000,
      });
      return;
    }

    setSaving(true);
    const id = toast.loading('Guardando configuración...');

    try {
      const formData = new FormData();
      formData.append('heroTitle', heroTitle);
      formData.append('heroSubtitle', heroSubtitle);
      formData.append('heroCta', heroCta);
      if (imageFile) formData.append('heroImage', imageFile);
      if (config.heroImageUrl) formData.append('currentHeroImageUrl', config.heroImageUrl);
      formData.append('brandStoryText', brandText);
      if (brandImageFile) formData.append('brandStoryImage', brandImageFile);
      if (brandImagePreview && !brandImageFile) formData.append('currentBrandStoryImageUrl', brandImagePreview);

      const result = await updateSiteConfig(formData);

      if (result.ok) {
        toast.success('Configuración guardada', {
          id,
          description: 'La página principal se actualizará en breve',
        });
        setImageFile(null);
      } else {
        toast.error(result.message ?? 'Error al guardar', { id });
      }
    } catch (err) {
      console.error('[SiteConfig] Error inesperado:', err);
      toast.error('No se pudo guardar. Intenta de nuevo.', { id });
    } finally {
      setSaving(false);
    }
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    // Validar por extensión además de MIME (algunos navegadores devuelven type vacío)
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name);
    if (!isVideo) {
      toast.error('Solo se permiten archivos de video (MP4, WebM…)');
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      toast.error('El video no puede superar 200 MB');
      return;
    }

    setUploadingVideo(true);
    const tid = toast.loading('Obteniendo firma de subida...');

    try {
      const sig = await getCloudinaryVideoSignature();
      if (!sig.ok) { toast.error(sig.message, { id: tid }); return; }

      toast.loading('Subiendo video...', { id: tid });

      const form = new FormData();
      form.append('file',      file);
      form.append('api_key',   sig.api_key);
      form.append('timestamp', String(sig.timestamp));
      form.append('signature', sig.signature);
      form.append('folder',    sig.folder);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloud_name}/video/upload`,
        { method: 'POST', body: form },
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = (errData as { error?: { message?: string } })?.error?.message ?? `Error HTTP ${res.status}`;
        throw new Error(msg);
      }

      const data      = await res.json();
      const newVideo  = data.secure_url as string;
      const newPoster = newVideo
        .replace('/upload/', '/upload/so_0,q_auto,f_auto/')
        .replace(/\.[^.]+$/, '.jpg');

      toast.loading('Guardando...', { id: tid });
      const save = await saveHeroVideo(newVideo, newPoster);
      if (!save.ok) { toast.error(save.message ?? 'Error al guardar', { id: tid }); return; }

      setVideoUrl(newVideo);
      setPosterUrl(newPoster);
      toast.success('Video subido y guardado', { id: tid });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al subir el video';
      toast.error(msg, { id: tid });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleRemoveVideo = async () => {
    const tid = toast.loading('Eliminando video...');
    const result = await saveHeroVideo(null, null);
    if (result.ok) {
      setVideoUrl(null);
      setPosterUrl(null);
      toast.success('Video eliminado', { id: tid });
    } else {
      toast.error(result.message ?? 'Error', { id: tid });
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
              sizes="(max-width: 1024px) 100vw, 800px"
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

      {/* Video hero */}
      <div className="space-y-4">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted">
          Video de fondo — opcional
        </p>
        <p className="text-xs text-kyzz-muted leading-relaxed">
          Reemplaza la imagen estática por un video en loop. Se sube directamente a Cloudinary (hasta 200 MB · MP4 o WebM recomendado).
          Si hay video activo, tiene prioridad sobre la imagen de fondo.
        </p>

        <input
          ref={videoFileRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/*"
          className="hidden"
          onChange={handleVideoSelect}
        />

        {videoUrl && posterUrl ? (
          <div className="space-y-3">
            <div className="relative w-full aspect-[16/5] overflow-hidden bg-kyzz-dark border border-kyzz-secondary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={posterUrl} alt="Poster del video" className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 flex items-center justify-center">
                <IoVideocamOutline size={32} className="text-white/70" />
              </div>
              <button
                type="button"
                onClick={handleRemoveVideo}
                className="absolute top-3 right-3 bg-white/90 hover:bg-white text-kyzz-dark p-1.5 border border-kyzz-secondary transition-colors"
              >
                <IoTrashOutline size={14} />
              </button>
              <span className="absolute bottom-3 left-3 text-[10px] tracking-widest uppercase bg-kyzz-dark text-white px-2 py-1">
                Video activo
              </span>
            </div>
            <button
              type="button"
              disabled={uploadingVideo}
              onClick={() => videoFileRef.current?.click()}
              className="text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
            >
              {uploadingVideo ? 'Subiendo...' : 'Cambiar video'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploadingVideo}
            onClick={() => videoFileRef.current?.click()}
            className="w-full border border-dashed border-kyzz-secondary hover:border-kyzz-primary transition-colors flex flex-col items-center justify-center gap-3 py-12 text-kyzz-muted hover:text-kyzz-primary disabled:opacity-50"
          >
            <IoVideocamOutline size={28} />
            <span className="text-[11px] tracking-widest uppercase">
              {uploadingVideo ? 'Subiendo video...' : 'Subir video'}
            </span>
            <span className="text-xs">MP4, WebM · Máx 200 MB</span>
          </button>
        )}
      </div>

      {/* Brand Story */}
      <div className="space-y-4">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted">
          Historia de marca — opcional
        </p>
        <p className="text-xs text-kyzz-muted leading-relaxed">
          Sección editorial split imagen/texto en la homepage. Si se deja vacía se muestra la frase de marca por defecto.
        </p>

        {/* Texto */}
        <div>
          <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-2">
            Texto editorial
          </label>
          <textarea
            className="kyzz-input resize-none min-h-[96px]"
            value={brandText}
            onChange={e => setBrandText(e.target.value)}
            placeholder={'Ej: Un beso a tu estilo propio.\nKyzz nace de la unión y el detalle.'}
          />
          <p className="mt-1 text-[10px] text-kyzz-muted">Usa Enter para saltos de línea dentro de la cita.</p>
        </div>

        {/* Imagen */}
        <input
          ref={brandImageRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleBrandImageChange}
        />

        {brandImagePreview ? (
          <div className="relative w-full aspect-[4/3] overflow-hidden bg-kyzz-tertiary border border-kyzz-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brandImagePreview} alt="Brand Story preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={handleRemoveBrandImage}
              className="absolute top-3 right-3 bg-white/90 hover:bg-white text-kyzz-dark p-1.5 border border-kyzz-secondary transition-colors"
            >
              <IoTrashOutline size={14} />
            </button>
            {brandImageFile && (
              <span className="absolute bottom-3 left-3 text-[10px] tracking-widest uppercase bg-kyzz-dark text-white px-2 py-1">
                Nueva imagen
              </span>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => brandImageRef.current?.click()}
            className="w-full border border-dashed border-kyzz-secondary hover:border-kyzz-primary transition-colors flex flex-col items-center justify-center gap-3 py-12 text-kyzz-muted hover:text-kyzz-primary"
          >
            <IoCloudUploadOutline size={28} />
            <span className="text-[11px] tracking-widest uppercase">Subir imagen editorial</span>
            <span className="text-xs">JPG, PNG, WebP · Máx 4 MB · Proporción 4:3 recomendada</span>
          </button>
        )}

        {brandImagePreview && (
          <button
            type="button"
            onClick={() => brandImageRef.current?.click()}
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
