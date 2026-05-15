import { redirect } from 'next/navigation';
import { getCategories, getProductBySlug, getColorPalette, getProductVariants } from '@/actions';
import { getProductColors as fetchProductColors } from '@/actions/product/manage-product-color';
import { Title } from '@/components';
import { titleFont } from '@/config/fonts';
import { ProductForm } from './ui/ProductForm';
import { ProductColorsManager } from './ui/ProductColorsManager';
import { ProductVariantsManager } from './ui/ProductVariantsManager';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage(props: Props) {
  const { slug } = await props.params;

  const [product, categories, palette] = await Promise.all([
    getProductBySlug(slug),
    getCategories(),
    getColorPalette(),
  ]);

  if (!product && slug !== 'new') redirect('/admin/products');

  const [productColors, productVariants] = product?.id
    ? await Promise.all([
        fetchProductColors(product.id),
        getProductVariants(product.id),
      ])
    : [[], []];

  const title = slug === 'new' ? 'Nuevo producto' : 'Editar producto';

  return (
    <>
      <Title title={title} />
      <ProductForm product={product ?? {}} categories={categories} hasColors={productColors.length > 0} />

      {/* ── Colores: solo después de crear el producto ── */}
      {product?.id ? (
        <>
          <div className="max-w-3xl mx-auto mt-10 px-5 sm:px-0">
            <div className="mb-5 border-t border-kyzz-secondary pt-8">
              <h2 className={`${titleFont.className} text-xl font-normal text-kyzz-dark mb-1`}>
                Colores del producto
              </h2>
              <p className="text-xs text-kyzz-muted">
                Asigna colores de la paleta y sube las imágenes específicas de cada variante.
              </p>
            </div>
            <ProductColorsManager
              productId={product.id}
              productSlug={product.slug ?? slug}
              palette={palette}
              hasDirectImages={(product.ProductImage?.length ?? 0) > 0}
              initialColors={productColors.map((pc) => ({
                id:             pc.id,
                paletteColorId: pc.paletteColorId,
                paletteColor:   { id: pc.paletteColor.id, name: pc.paletteColor.name, hex: pc.paletteColor.hex },
                images:         pc.images.map((i) => ({ id: i.id, url: i.url, sortOrder: i.sortOrder })),
              }))}
            />
          </div>

          {/* ── Variantes / Inventario por talla y color ── */}
          <div className="max-w-3xl mx-auto mt-10 px-5 sm:px-0">
            <div className="mb-5 border-t border-kyzz-secondary pt-8">
              <h2 className={`${titleFont.className} text-xl font-normal text-kyzz-dark mb-1`}>
                Inventario y tallas
              </h2>
              <p className="text-xs text-kyzz-muted">
                Cada combinación talla {productColors.length > 0 ? '× color' : ''} es una variante con su propio stock.
              </p>
            </div>
            <ProductVariantsManager
              productId={product.id}
              colors={productColors.map((pc) => ({ id: pc.id, name: pc.paletteColor.name, hex: pc.paletteColor.hex }))}
              initialVariants={productVariants.map((v) => ({
                id:      v.id,
                colorId: v.colorId,
                size:    v.size,
                stock:   v.stock,
                sku:     v.sku,
              }))}
            />
          </div>
        </>
      ) : (
        <div className="max-w-3xl mx-auto mt-8 px-5 sm:px-0">
          <p className="text-xs text-kyzz-muted border border-dashed border-kyzz-secondary p-4 text-center">
            Guarda el producto primero para poder asignarle colores y variantes.
          </p>
        </div>
      )}
    </>
  );
}
