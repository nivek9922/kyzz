"use client";

import { useForm } from "react-hook-form";
import { Category, Product, ProductImage as ProductWithImage } from "@/interfaces";
import Image from "next/image";
import clsx from "clsx";
import { createUpdateProduct, deleteProductImage } from "@/actions";
import { useRouter } from 'next/navigation';
import { ProductImage } from '@/components';

interface Props {
  product: Partial<Product> & { ProductImage?: ProductWithImage[] };
  categories: Category[];
}

const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

interface FormInputs {
  title: string;
  slug: string;
  description: string;
  price: number;
  inStock: number;
  sizes: string[];
  tags: string;
  gender: "women" | "unisex";
  categoryId: string;
  isFeatured: boolean;

  images?: FileList;
}

export const ProductForm = ({ product, categories }: Props) => {

  const router = useRouter();

  const {
    handleSubmit,
    register,
    formState: { isValid },
    getValues,
    setValue,
    watch,
  } = useForm<FormInputs>({
    defaultValues: {
      ...product,
      gender: (product.gender as FormInputs['gender']) ?? 'women',
      tags: product.tags?.join(", "),
      sizes: product.sizes ?? [],
      isFeatured: product.isFeatured ?? false,
      images: undefined,
    },
  });

  watch("sizes");

  const onSizeChanged = (size: string) => {
    const sizes = new Set(getValues("sizes"));
    sizes.has(size) ? sizes.delete(size) : sizes.add(size);
    setValue("sizes", Array.from(sizes));
  };

  const onSubmit = async (data: FormInputs) => {
    const formData = new FormData();

    const { images, ...productToSave } = data;

    if ( product.id ){
      formData.append("id", product.id ?? "");
    }
    
    formData.append("title", productToSave.title);
    formData.append("slug", productToSave.slug);
    formData.append("description", productToSave.description);
    formData.append("price", productToSave.price.toString());
    formData.append("inStock", productToSave.inStock.toString());
    formData.append("sizes", productToSave.sizes.toString());
    formData.append("tags", productToSave.tags);
    formData.append("categoryId", productToSave.categoryId);
    formData.append("gender", productToSave.gender);
    formData.append("isFeatured", productToSave.isFeatured ? "true" : "false");
    
    if ( images ) {
      for ( let i = 0; i < images.length; i++  ) {
        formData.append('images', images[i]);
      }
    }



    const { ok, product:updatedProduct } = await createUpdateProduct(formData);

    if ( !ok ) {
      alert('Producto no se pudo actualizar');
      return;
    }

    router.replace(`/admin/product/${ updatedProduct?.slug }`)


  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid px-5 mb-16 grid-cols-1 sm:px-0 sm:grid-cols-2 gap-6"
    >
      {/* Textos */}
      <div className="w-full space-y-4">

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Título</label>
          <input
            type="text"
            className="kyzz-input"
            {...register("title", { required: true })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Slug</label>
          <input
            type="text"
            className="kyzz-input"
            {...register("slug", { required: true })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Descripción</label>
          <textarea
            rows={5}
            className="kyzz-input resize-none"
            {...register("description", { required: true })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Precio (COP)</label>
          <input
            type="number"
            className="kyzz-input"
            {...register("price", { required: true, min: 0 })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Tags (separados por coma)</label>
          <input
            type="text"
            className="kyzz-input"
            {...register("tags", { required: true })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Género</label>
          <select
            className="kyzz-input bg-transparent"
            {...register("gender", { required: true })}
          >
            <option value="">[Seleccione]</option>
            <option value="women">Mujer</option>
            <option value="unisex">Unisex</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Categoría</label>
          <select
            className="kyzz-input bg-transparent"
            {...register("categoryId", { required: true })}
          >
            <option value="">[Seleccione]</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Destacado */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-kyzz-primary"
            {...register("isFeatured")}
          />
          <span className="text-sm text-kyzz-dark">Colección Especial (destacado)</span>
        </label>

        <button className="btn-primary w-full mt-2">Guardar producto</button>
      </div>

      {/* Selector de tallas y fotos */}
      <div className="w-full space-y-4">

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Inventario</label>
          <input
            type="number"
            className="kyzz-input"
            {...register("inStock", { required: true, min: 0 })}
          />
        </div>

        {/* Tallas */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Tallas</span>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <div
                key={size}
                onClick={() => onSizeChanged(size)}
                className={clsx(
                  "w-11 h-11 border flex items-center justify-center cursor-pointer text-sm transition-all",
                  {
                    "bg-kyzz-dark text-white border-kyzz-dark": getValues("sizes").includes(size),
                    "border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary": !getValues("sizes").includes(size),
                  }
                )}
              >
                {size}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted">Fotos</label>
          <input
            type="file"
            { ...register('images') }
            multiple
            className="kyzz-input text-sm"
            accept="image/png, image/jpeg, image/avif"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          {product.ProductImage?.map((image) => (
            <div key={image.id}>
              <ProductImage
                alt={product.title ?? ""}
                src={ image.url }
                width={300}
                height={300}
                className="object-cover w-full aspect-[3/4]"
              />

              <button
                type="button"
                onClick={() => deleteProductImage(image.id, image.url)}
                className="w-full mt-1 text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-red-500 transition-colors py-1 border border-kyzz-secondary hover:border-red-300"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
};
