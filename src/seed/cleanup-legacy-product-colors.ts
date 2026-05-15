/**
 * Limpieza: elimina los ProductColor (+ ProductColorImage en cascada)
 * de los 5 productos legacy que tienen imágenes locales en /public/products/.
 *
 * Estos productos son "modo legacy": su galería viene de ProductImage (imágenes locales).
 * No deben tener variantes de color — esa funcionalidad es solo para productos nuevos
 * con imágenes alojadas en Cloudinary.
 *
 * Uso:
 *   npx tsx src/seed/cleanup-legacy-product-colors.ts
 */
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LEGACY_SLUGS = [
  'jean-wide-leg-oscuro',
  'enterizo-manga-corta-acanalado',
  'blusa-escote-v-viscosa',
  'enterizo-pantalon-espalda-descubierta',
  'blusa-manga-larga-cuello-bote',
];

async function main() {
  console.log('\nLimpiando colores de productos legacy...\n');

  for (const slug of LEGACY_SLUGS) {
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) {
      console.log(`  ⚠  No encontrado: ${slug}`);
      continue;
    }

    const colors = await prisma.productColor.findMany({
      where: { productId: product.id },
      include: { images: true },
    });

    if (colors.length === 0) {
      console.log(`  ✓  ${product.title} — sin colores (ya limpio)`);
      continue;
    }

    // Eliminar todas las ProductColorImage + ProductColor
    await prisma.productColorImage.deleteMany({
      where: { productColorId: { in: colors.map((c) => c.id) } },
    });
    await prisma.productColor.deleteMany({
      where: { productId: product.id },
    });

    // También eliminar ProductVariant ligadas a colores (quedan variantes sin color si las hay)
    const variantsWithColor = await prisma.productVariant.findMany({
      where: { productId: product.id, colorId: { not: null } },
    });
    if (variantsWithColor.length > 0) {
      await prisma.productVariant.deleteMany({
        where: { productId: product.id, colorId: { not: null } },
      });
      console.log(`  → ${variantsWithColor.length} variantes con color eliminadas`);
    }

    console.log(`  ✓  ${product.title} — ${colors.length} color(es) eliminado(s)`);
  }

  console.log('\n¡Listo! Los productos legacy ahora solo tienen imágenes generales.\n');
}

main()
  .catch(console.error)
  .then(() => prisma.$disconnect());
