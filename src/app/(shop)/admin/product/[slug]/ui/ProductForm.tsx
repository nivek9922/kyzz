"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Category, Product, ProductImage as ProductWithImage } from "@/interfaces";
import Image from "next/image";
import { toast } from 'sonner';
import { createUpdateProduct, deleteProductImage } from "@/actions";
import { useRouter } from 'next/navigation';
import { ProductImage } from '@/components';
import { IoColorPaletteOutline, IoImagesOutline } from 'react-icons/io5';

interface Props {
  product:    Partial<Product> & { ProductImage?: ProductWithImage[] };
  categories: Category[];
  hasColors?: boolean;
}

interface FormInputs {
  title:       string;
  slug:        string;
  description: string;
  price:       number;
  tags:        string;
  categoryId:  string;
  isFeatured:  boolean;
  images?:     FileList;
}

const MAX_IMAGES = 12;

export const ProductForm = ({ product, categories, hasColors = false }: Props) => {

  const router = useRouter();
  const [imagePreviews, setImagePreviews]   = useState<string[]>([]);
  const [savedImages, setSavedImages]       = useState(product.ProductImage ?? []);
  // Para productos nuevos: el admin elige el tipo. 'color' oculta la galería general.
  const isNewProduct = !product.id;
  const [newProductType, setNewProductType] = useState<'image' | 'color'>('image');

  const existingCount = savedImages.length;
  const maxNewImages  = Math.max(0, MAX_IMAGES - existingCount);

  const {
    handleSubmit,
    register,
    formState: { isValid },
  } = useForm<FormInputs>({
    defaultValues: {
      title:       product.title       ?? '',
      slug:        product.slug        ?? '',
      description: product.description ?? '',
      price:       product.price       ?? 0,
      tags:        product.tags?.join(', ') ?? '',
      categoryId:  product.categoryId  ?? '',
      isFeatured:  product.isFeatured  ?? false,
    },
  });

  const imagesRegistration = register('images');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);

    if (files.length > maxNewImages) {
      toast.error(
        maxNewImages === 0
          ? `Este producto ya tiene el máximo de imágenes (${MAX_IMAGES})`
          : `Solo puedes agregar ${maxNewImages} imagen${maxNewImages > 1 ? 'es' : ''} más`
      );
      e.target.value = '';
      return;
    }

    imagesRegistration.onChange(e);
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImagePreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const onSubmit = async (data: FormInputs) => {
    const formData = new FormData();
    const { images, ...productToSave } = data;

    if (product.id) formData.append("id", product.id);

    formData.append("title",       productToSave.title);
    formData.append("slug",        productToSave.slug);
    formData.append("description", productToSave.description);
    formData.append("price",       productToSave.price.toString());
    formData.append("tags",        productToSave.tags);
    formData.append("categoryId",  productToSave.categoryId);
    formData.append("isFeatured",  productToSave.isFeatured ? "true" : "false");

    if (images) {
      for (let i = 0; i < images.length; i++) {
        formData.append('images', images[i]);
      }
    }

    const toastId = toast.loading(product.id ? 'Guardando cambios...' : 'Creando producto...');
    const { ok, product: updatedProduct, images: savedImgs } = await createUpdateProduct(formData);

    if (!ok) {
      toast.error('No se pudo guardar el producto', {
        id: toastId,
        description: 'Revisa los campos e intenta de nuevo.',
      });
      return;
    }

    toast.success(product.id ? 'Producto actualizado' : 'Producto creado', { id: toastId });
    setImagePreviews([]);
    if (savedImgs) setSavedImages(savedImgs as unknown as typeof savedImages);
    router.replace(`/admin/product/${updatedProduct?.slug}`);
  };

  // Ocultar columna de imágenes cuando:
  // - Producto existente con colores y sin imágenes residuales
  // - Producto nuevo con tipo 'color' seleccionado
  const hideImageColumn =
    (!isNewProduct && hasColors && savedImages.length === 0) ||
    (isNewProduct && newProductType === 'color');

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`grid px-5 mb-8 grid-cols-1 sm:px-0 gap-6 ${hideImageColumn ? '' : 'sm:grid-cols-2'}`}
    >
      {/* ── Columna izquierda: textos ── */}
      <div className="w-full space-y-4">

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Título</label>
          <input type="text" className="kyzz-input" {...register("title", { required: true })} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Slug</label>
          <input type="text" className="kyzz-input" {...register("slug", { required: true })} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Descripción</label>
          <textarea rows={5} className="kyzz-input resize-none" {...register("description", { required: true })} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Precio (COP)</label>
          <input type="number" className="kyzz-input" {...register("price", { required: true, min: 0 })} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Tags (separados por coma)</label>
          <input type="text" className="kyzz-input" {...register("tags", { required: true })} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Categoría</label>
          <select className="kyzz-input bg-transparent" {...register("categoryId", { required: true })}>
            <option value="">[Seleccione]</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-kyzz-primary" {...register("isFeatured")} />
          <span className="text-sm text-kyzz-dark">Colección Especial (destacado)</span>
        </label>

        {/* Tipo de imágenes — solo visible al crear */}
        {isNewProduct && (
          <div className="border border-kyzz-secondary p-4 space-y-3">
            <p className="text-[10px] tracking-[0.18em] uppercase text-kyzz-muted">Tipo de imágenes</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewProductType('image')}
                className={`flex flex-col items-center gap-2 p-3 border text-left transition-colors ${
                  newProductType === 'image'
                    ? 'border-kyzz-dark bg-kyzz-tertiary'
                    : 'border-kyzz-secondary hover:border-kyzz-muted'
                }`}
              >
                <IoImagesOutline size={20} className={newProductType === 'image' ? 'text-kyzz-dark' : 'text-kyzz-muted'} />
                <span className="text-xs text-kyzz-dark font-medium">Sin color</span>
                <span className="text-[10px] text-kyzz-muted leading-tight text-center">Galería general · 1 o 2 fotos</span>
              </button>
              <button
                type="button"
                onClick={() => setNewProductType('color')}
                className={`flex flex-col items-center gap-2 p-3 border text-left transition-colors ${
                  newProductType === 'color'
                    ? 'border-kyzz-dark bg-kyzz-tertiary'
                    : 'border-kyzz-secondary hover:border-kyzz-muted'
                }`}
              >
                <IoColorPaletteOutline size={20} className={newProductType === 'color' ? 'text-kyzz-dark' : 'text-kyzz-muted'} />
                <span className="text-xs text-kyzz-dark font-medium">Con variantes de color</span>
                <span className="text-[10px] text-kyzz-muted leading-tight text-center">Imágenes por color · asignas después</span>
              </button>
            </div>
            {newProductType === 'color' && (
              <p className="text-[10px] text-kyzz-muted bg-kyzz-neutral px-2 py-1.5">
                Guarda el producto primero. Luego asigna colores e imágenes en la sección de abajo.
              </p>
            )}
          </div>
        )}

        <button className="btn-primary w-full mt-2" disabled={!isValid}>Guardar producto</button>

        <p className="text-[10px] text-kyzz-muted leading-relaxed">
          Las tallas y el stock se gestionan abajo, en <strong>Inventario y tallas</strong>.
          {!product.id && ' Disponible después de crear el producto.'}
        </p>
      </div>

      {/* ── Columna derecha: imágenes (solo cuando aplica) ── */}
      {!hideImageColumn && (
      <div className="w-full space-y-4">

        {hasColors ? (
          /* Producto con colores + imágenes residuales: mostrar aviso y opción de eliminar */
          <div className="border border-kyzz-secondary bg-kyzz-neutral p-4 space-y-3">
            <p className="text-[10px] tracking-[0.18em] uppercase text-kyzz-muted">Imágenes generales</p>
            <p className="text-xs text-kyzz-dark leading-relaxed">
              Este producto usa <strong>variantes de color</strong>. Las imágenes se gestionan
              por color en la sección <strong>Colores del producto</strong> de abajo.
            </p>
            {savedImages.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1.5 leading-relaxed">
                  Hay {savedImages.length} imagen{savedImages.length > 1 ? 'es' : ''} general{savedImages.length > 1 ? 'es' : ''} guardada{savedImages.length > 1 ? 's' : ''}.
                  Elimínalas para evitar duplicación con las imágenes de color.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedImages.map((image) => (
                    <div key={image.id}>
                      <ProductImage
                        alt={product.title ?? ''}
                        src={image.url}
                        width={300}
                        height={300}
                        className="object-cover w-full aspect-[3/4] opacity-60"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const { ok } = await deleteProductImage(image.id, image.url);
                          if (ok) {
                            setSavedImages((prev) => prev.filter((i) => i.id !== image.id));
                            toast.success('Imagen eliminada');
                          } else {
                            toast.error('No se pudo eliminar la imagen');
                          }
                        }}
                        className="w-full mt-1 text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-red-500 transition-colors py-1 border border-kyzz-secondary hover:border-red-300"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Producto sin colores: galería general activa */
          <>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Fotos principales</label>
                <span className="text-[10px] text-kyzz-muted">{existingCount + imagePreviews.length} / {MAX_IMAGES}</span>
              </div>
              <input
                type="file"
                {...imagesRegistration}
                onChange={handleImageChange}
                multiple={maxNewImages > 1}
                disabled={maxNewImages === 0}
                className={`kyzz-input text-sm ${maxNewImages === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                accept="image/png, image/jpeg, image/jpg, image/webp, image/avif"
              />
              <p className="text-[10px] text-kyzz-muted leading-relaxed">
                Galería general (productos sin variantes de color). Si vas a usar colores, deja esto vacío
                y sube las imágenes en la sección <strong>Colores del producto</strong>.
              </p>
            </div>

            {imagePreviews.length > 0 && (
              <div>
                <p className="text-[10px] tracking-[0.18em] uppercase text-kyzz-muted mb-2">Vista previa</p>
                <div className="grid grid-cols-2 gap-3">
                  {imagePreviews.map((url, i) => (
                    <div key={i} className="relative">
                      <Image
                        src={url}
                        alt={`preview-${i}`}
                        width={300}
                        height={300}
                        className="object-cover w-full aspect-[3/4]"
                        unoptimized
                      />
                      <span className="absolute top-1 right-1 bg-kyzz-primary text-white text-[9px] tracking-widest uppercase px-1.5 py-0.5">
                        Nueva
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {savedImages.length > 0 && (
              <div>
                <p className="text-[10px] tracking-[0.18em] uppercase text-kyzz-muted mb-2">Imágenes guardadas</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedImages.map((image) => (
                    <div key={image.id}>
                      <ProductImage
                        alt={product.title ?? ''}
                        src={image.url}
                        width={300}
                        height={300}
                        className="object-cover w-full aspect-[3/4]"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const { ok } = await deleteProductImage(image.id, image.url);
                          if (ok) {
                            setSavedImages((prev) => prev.filter((i) => i.id !== image.id));
                            toast.success('Imagen eliminada');
                          } else {
                            toast.error('No se pudo eliminar la imagen');
                          }
                        }}
                        className="w-full mt-1 text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-red-500 transition-colors py-1 border border-kyzz-secondary hover:border-red-300"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      )}
    </form>
  );
};
