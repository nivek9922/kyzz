/**
 * Backfill de ProductVariant desde la estructura existente.
 *
 * Para cada producto:
 *  - Si tiene colores asignados → crea una variante por cada (color × talla)
 *  - Si NO tiene colores → crea una variante por cada talla, con colorId=null
 *
 * Cada variante recibe stock = product.inStock (replicado).
 * Esto sobrestima inventario, pero garantiza que nada quede agotado al migrar.
 * Después el admin ajusta stock real en la matriz de variantes.
 *
 * Idempotente: ignora variantes ya existentes (composite unique).
 *
 * Uso:
 *   npx tsx src/seed/backfill-variants.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: { ProductColors: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\nMigrando ${products.length} productos a variantes...\n`);

  let created = 0;
  let skipped = 0;
  let productsWithoutSizes = 0;

  for (const product of products) {
    if (product.sizes.length === 0) {
      console.log(`  ⚠ ${product.slug} — sin tallas definidas, omitido`);
      productsWithoutSizes++;
      continue;
    }

    const stock = product.inStock;
    const colorIds: (string | null)[] =
      product.ProductColors.length > 0
        ? product.ProductColors.map((c) => c.id)
        : [null];

    const variantsToCreate = colorIds.flatMap((colorId) =>
      product.sizes.map((size) => ({
        productId: product.id,
        colorId,
        size,
        stock,
      }))
    );

    const res = await prisma.productVariant.createMany({
      data: variantsToCreate,
      skipDuplicates: true, // idempotente: si ya existe (productId, colorId, size), no falla
    });

    created += res.count;
    skipped += variantsToCreate.length - res.count;

    const colorLabel = product.ProductColors.length > 0
      ? `${product.ProductColors.length} color(es)`
      : 'sin color';
    console.log(
      `  ✓ ${product.slug} — ${colorLabel} × ${product.sizes.length} tallas → ${res.count} variantes (stock ${stock} c/u)`
    );
  }

  console.log(`\n────────────────────────────────────────`);
  console.log(`  Variantes creadas:     ${created}`);
  console.log(`  Ya existían (skipped): ${skipped}`);
  console.log(`  Productos sin tallas:  ${productsWithoutSizes}`);
  console.log(`────────────────────────────────────────`);
  console.log(`\nListo. Ajusta el stock real en /admin/product/[slug].\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
