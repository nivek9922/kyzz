/**
 * Reemplaza las imágenes Unsplash de demo con las imágenes reales
 * de cada producto. En demo, todos los colores del mismo producto
 * apuntan a las mismas fotos — el usuario reemplazará con fotos
 * reales por color desde el admin.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const productColors = await prisma.productColor.findMany({
    include: {
      product: { include: { ProductImage: { orderBy: { id: 'asc' } } } },
      paletteColor: { select: { name: true } },
    },
  });

  console.log(`Actualizando ${productColors.length} colores...\n`);

  for (const pc of productColors) {
    const productImages = pc.product.ProductImage;
    if (productImages.length === 0) {
      console.log(`  ⚠ ${pc.product.slug} / ${pc.paletteColor.name} — sin imágenes base, se omite`);
      continue;
    }

    // Borrar imágenes demo
    await prisma.productColorImage.deleteMany({ where: { productColorId: pc.id } });

    // Crear con las imágenes reales del producto
    await prisma.productColorImage.createMany({
      data: productImages.map((img, i) => ({
        url:           img.url,
        sortOrder:     i,
        productColorId: pc.id,
      })),
    });

    console.log(`  ✓ ${pc.product.slug} / ${pc.paletteColor.name} → ${productImages.length} imagen(es): ${productImages.map(i => i.url).join(', ')}`);
  }

  console.log('\n¡Listo! Ahora los swatches muestran las fotos reales del producto.');
  console.log('Sube fotos por color desde /admin/product/[slug] cuando tengas las fotos definitivas.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
