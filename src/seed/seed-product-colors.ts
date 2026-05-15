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

// IDs de colores de la paleta (deben coincidir con los de la BD tras seed-color-palette.ts)
const COLOR = {
  blancoRoto:   'c29327d0-1abb-4d4a-b6e2-430fb77a792e',
  crema:        'd07f8f16-2875-4947-83b1-3079a0161f51',
  beige:        '603e482e-8238-4f49-94de-8a8a8f2fbf34',
  rosaPalo:     '37164d06-55ab-4755-a79f-302b4c1b034d',
  lavanda:      '4be58ee2-50b5-49c6-9f3b-31a88b0c6742',
  sage:         '766f09de-5208-4d1c-ba01-93fd9dbed244',
  azulNiebla:   '33c10690-139a-4f54-8b0c-f835863c8280',
  terracota:    'b1885abc-a235-4572-b489-c515685ff93e',
  marronTierra: 'c8cc1ea9-b17c-450b-964b-2bc22957065b',
  negroCarbon:  'b0be1044-d802-4a86-9648-6bb051b789ea',
};

/**
 * Cada entrada define qué colores asignar a un producto y qué imágenes usar.
 * Las imágenes son filenames locales de /public/products/ — coherentes con el producto.
 * Para cada color se usa el mismo set de fotos (placeholder: el admin las reemplaza).
 */
const DATA: Array<{
  slug:   string;
  colors: Array<{ paletteColorId: string; images: string[] }>;
}> = [
  // Jean oscuro → color único negro carbón + sus fotos de denim oscuro
  {
    slug: 'jean-wide-leg-oscuro',
    colors: [
      {
        paletteColorId: COLOR.negroCarbon,
        images: ['1473819-00-A_1_2000.jpg', '1473819-00-A_alt.jpg'],
      },
    ],
  },

  // Enterizo acanalado → beige, rosa palo, marrón tierra (3 colores)
  {
    slug: 'enterizo-manga-corta-acanalado',
    colors: [
      {
        paletteColorId: COLOR.beige,
        images: ['1740226-00-A_0_2000.jpg', '1740226-00-A_1.jpg'],
      },
      {
        paletteColorId: COLOR.rosaPalo,
        images: ['1740226-00-A_1.jpg', '1740226-00-A_0_2000.jpg'],
      },
      {
        paletteColorId: COLOR.marronTierra,
        images: ['1740226-00-A_0_2000.jpg', '1740226-00-A_1.jpg'],
      },
    ],
  },

  // Blusa escote V → blanco roto, rosa palo
  {
    slug: 'blusa-escote-v-viscosa',
    colors: [
      {
        paletteColorId: COLOR.blancoRoto,
        images: ['8765120-00-A_0_2000.jpg', '8765120-00-A_1.jpg'],
      },
      {
        paletteColorId: COLOR.rosaPalo,
        images: ['8765120-00-A_1.jpg', '8765120-00-A_0_2000.jpg'],
      },
    ],
  },

  // Enterizo espalda descubierta → terracota, sage
  {
    slug: 'enterizo-pantalon-espalda-descubierta',
    colors: [
      {
        paletteColorId: COLOR.terracota,
        images: ['9877040-00-A_0_2000.jpg', '9877040-00-A_1.jpg'],
      },
      {
        paletteColorId: COLOR.sage,
        images: ['9877040-00-A_1.jpg', '9877040-00-A_0_2000.jpg'],
      },
    ],
  },

  // Blusa manga larga cuello bote → crema, lavanda
  {
    slug: 'blusa-manga-larga-cuello-bote',
    colors: [
      {
        paletteColorId: COLOR.crema,
        images: ['8765100-00-A_0_2000.jpg', '8765100-00-A_1.jpg'],
      },
      {
        paletteColorId: COLOR.lavanda,
        images: ['8765100-00-A_1.jpg', '8765100-00-A_0_2000.jpg'],
      },
    ],
  },
];

async function main() {
  console.log('Sembrando colores en productos...\n');

  for (const entry of DATA) {
    const product = await prisma.product.findUnique({ where: { slug: entry.slug } });
    if (!product) { console.log(`  ⚠ No encontrado: ${entry.slug}`); continue; }

    console.log(`Producto: ${product.title}`);

    // Eliminar imágenes generales para evitar duplicación con las de color
    const deleted = await prisma.productImage.deleteMany({ where: { productId: product.id } });
    if (deleted.count > 0) {
      console.log(`  → ${deleted.count} ProductImage eliminada(s) (evitar duplicación)`);
    }

    for (const colorEntry of entry.colors) {
      // Obtener o crear ProductColor
      let pc = await prisma.productColor.findUnique({
        where: { productId_paletteColorId: { productId: product.id, paletteColorId: colorEntry.paletteColorId } },
      });
      if (!pc) {
        pc = await prisma.productColor.create({
          data: { productId: product.id, paletteColorId: colorEntry.paletteColorId },
        });
      }

      const palette = await prisma.colorPalette.findUnique({ where: { id: colorEntry.paletteColorId } });
      console.log(`  ✓ ${palette?.name}`);

      // Reemplazar imágenes del color
      await prisma.productColorImage.deleteMany({ where: { productColorId: pc.id } });
      await prisma.productColorImage.createMany({
        data: colorEntry.images.map((url, i) => ({ url, sortOrder: i, productColorId: pc!.id })),
      });
      console.log(`    → ${colorEntry.images.length} imágenes locales`);
    }
    console.log('');
  }

  console.log('¡Listo! Ejecuta backfill-variants.ts para sincronizar el inventario.\n');
}

main()
  .catch(console.error)
  .then(() => prisma.$disconnect());
