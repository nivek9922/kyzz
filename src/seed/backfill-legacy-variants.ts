/**
 * Backfill: crea ProductVariant (sin color) para los productos legacy
 * que tienen product.sizes y product.inStock pero cero variantes.
 *
 * Uso:
 *   npx tsx src/seed/backfill-legacy-variants.ts
 */
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SLUGS = [
  'jean-wide-leg-oscuro',
  'enterizo-manga-corta-acanalado',
  'blusa-escote-v-viscosa',
  'enterizo-pantalon-espalda-descubierta',
];

async function main() {
  console.log('\nCreando variantes para productos legacy...\n');

  for (const slug of SLUGS) {
    const p = await prisma.product.findUnique({ where: { slug } });
    if (!p) { console.log(`  ⚠  No encontrado: ${slug}`); continue; }
    if (p.sizes.length === 0) { console.log(`  ⚠  ${p.title}: sin tallas definidas`); continue; }

    const existing = await prisma.productVariant.count({
      where: { productId: p.id, colorId: null },
    });
    if (existing > 0) {
      console.log(`  ~  ${p.title}: ya tiene ${existing} variante(s), omitido`);
      continue;
    }

    const stockPerSize = Math.max(1, Math.ceil(p.inStock / p.sizes.length));
    await prisma.productVariant.createMany({
      data: p.sizes.map((size) => ({
        productId: p.id,
        colorId:   null,
        size,
        stock:     stockPerSize,
      })),
    });

    console.log(`  ✓  ${p.title} — ${p.sizes.length} variantes · ${stockPerSize} uds/talla`);
  }

  console.log('\n¡Listo! Los productos legacy son comprables de nuevo.\n');
}

main()
  .catch(console.error)
  .then(() => prisma.$disconnect());
