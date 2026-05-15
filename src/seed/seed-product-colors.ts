/**
 * Seed: asigna colores demo a 5 productos usando sus propias imágenes locales.
 *
 * Las imágenes locales son coherentes con el producto (son las fotos reales del ítem).
 * El admin puede reemplazarlas por fotos específicas de cada color desde el panel.
 *
 * También elimina los registros ProductImage de estos productos para evitar
 * duplicación entre la galería general y las imágenes de color.
 *
 * Idempotente: ejecutar más de una vez no genera duplicados.
 */
import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DATA: Array<{
  slug:   string;
  colors: Array<{ paletteName: string; images: string[] }>;
}> = [
  // Jean oscuro → negro carbón
  {
    slug: 'jean-wide-leg-oscuro',
    colors: [
      {
        paletteName: 'Negro carbón',
        images: ['1473819-00-A_1_2000.jpg', '1473819-00-A_alt.jpg'],
      },
    ],
  },

  // Enterizo acanalado → beige, rosa palo, marrón tierra
  {
    slug: 'enterizo-manga-corta-acanalado',
    colors: [
      {
        paletteName: 'Beige',
        images: ['1740226-00-A_0_2000.jpg', '1740226-00-A_1.jpg'],
      },
      {
        paletteName: 'Rosa palo',
        images: ['1740226-00-A_1.jpg', '1740226-00-A_0_2000.jpg'],
      },
      {
        paletteName: 'Marrón tierra',
        images: ['1740226-00-A_0_2000.jpg', '1740226-00-A_1.jpg'],
      },
    ],
  },

  // Blusa escote V → blanco roto, rosa palo
  {
    slug: 'blusa-escote-v-viscosa',
    colors: [
      {
        paletteName: 'Blanco roto',
        images: ['8765120-00-A_0_2000.jpg', '8765120-00-A_1.jpg'],
      },
      {
        paletteName: 'Rosa palo',
        images: ['8765120-00-A_1.jpg', '8765120-00-A_0_2000.jpg'],
      },
    ],
  },

  // Enterizo espalda descubierta → terracota, sage
  {
    slug: 'enterizo-pantalon-espalda-descubierta',
    colors: [
      {
        paletteName: 'Terracota',
        images: ['9877040-00-A_0_2000.jpg', '9877040-00-A_1.jpg'],
      },
      {
        paletteName: 'Sage',
        images: ['9877040-00-A_1.jpg', '9877040-00-A_0_2000.jpg'],
      },
    ],
  },

  // Blusa manga larga cuello bote → crema, lavanda
  {
    slug: 'blusa-manga-larga-cuello-bote',
    colors: [
      {
        paletteName: 'Crema',
        images: ['8765100-00-A_0_2000.jpg', '8765100-00-A_1.jpg'],
      },
      {
        paletteName: 'Lavanda',
        images: ['8765100-00-A_1.jpg', '8765100-00-A_0_2000.jpg'],
      },
    ],
  },
];

async function main() {
  console.log('Sembrando colores en productos...\n');

  // Cargar paleta completa → mapa nombre → id
  const palette = await prisma.colorPalette.findMany();
  const paletteByName = new Map(palette.map((c) => [c.name, c.id]));

  if (paletteByName.size === 0) {
    console.error('❌ La paleta de colores está vacía. Corre seed-color-palette.ts primero.');
    process.exit(1);
  }

  for (const entry of DATA) {
    const product = await prisma.product.findUnique({ where: { slug: entry.slug } });
    if (!product) { console.log(`  ⚠ No encontrado: ${entry.slug}`); continue; }

    console.log(`Producto: ${product.title}`);

    // Eliminar imágenes generales para evitar duplicación con las de color
    const deleted = await prisma.productImage.deleteMany({ where: { productId: product.id } });
    if (deleted.count > 0) {
      console.log(`  → ${deleted.count} ProductImage eliminada(s)`);
    }

    for (const colorEntry of entry.colors) {
      const paletteColorId = paletteByName.get(colorEntry.paletteName);
      if (!paletteColorId) {
        console.log(`  ⚠ Color no encontrado en paleta: "${colorEntry.paletteName}"`);
        continue;
      }

      // Obtener o crear ProductColor
      let pc = await prisma.productColor.findUnique({
        where: { productId_paletteColorId: { productId: product.id, paletteColorId } },
      });
      if (!pc) {
        pc = await prisma.productColor.create({
          data: { productId: product.id, paletteColorId },
        });
      }

      console.log(`  ✓ ${colorEntry.paletteName}`);

      // Reemplazar imágenes del color
      await prisma.productColorImage.deleteMany({ where: { productColorId: pc.id } });
      await prisma.productColorImage.createMany({
        data: colorEntry.images.map((url, i) => ({ url, sortOrder: i, productColorId: pc!.id })),
      });
      console.log(`    → ${colorEntry.images.length} imágenes`);
    }
    console.log('');
  }

  console.log('¡Listo! Ejecuta backfill-variants.ts para sincronizar el inventario.\n');
}

main()
  .catch(console.error)
  .then(() => prisma.$disconnect());
