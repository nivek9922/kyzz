/**
 * Seed: crea 4 productos NUEVOS con variantes de color e imágenes alojadas en Cloudinary.
 *
 * Cada producto:
 *  - Se crea sin ProductImage (usa solo imágenes por color)
 *  - Tiene 2-3 colores de paleta
 *  - Cada color tiene 2 imágenes subidas a Cloudinary desde URLs de Unsplash
 *  - Se crean variantes (ProductVariant) con stock demo
 *
 * Idempotente por slug: si el producto ya existe, solo actualiza colores/imágenes.
 *
 * Uso:
 *   npx tsx src/seed/seed-new-color-products.ts
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient, Size } from '@prisma/client';

// Cloudinary lee process.env en el import (ESM hoist). Necesitamos configurar
// explícitamente parseando el .env — cloudinary.config({...}) sí sobreescribe el default.
function loadCloudinaryFromEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^CLOUDINARY_URL=["']?(cloudinary:\/\/.+?)["']?\s*$/);
      if (!m) continue;
      // cloudinary://API_KEY:API_SECRET@CLOUD_NAME
      const u = new URL(m[1].replace('cloudinary://', 'https://'));
      cloudinary.config({
        cloud_name: u.hostname,
        api_key:    u.username,
        api_secret: decodeURIComponent(u.password),
        secure:     true,
      });
      return;
    }
  } catch { /* silencioso */ }
  // Fallback: intentar con CLOUDINARY_URL ya en el entorno
  if (process.env.CLOUDINARY_URL) cloudinary.config(process.env.CLOUDINARY_URL);
}

loadCloudinaryFromEnv();

const prisma = new PrismaClient();

// ── Imágenes fuente (Unsplash, confirmadas válidas — se alojan en Cloudinary del proyecto) ──
// Formato auto=format requerido por el CDN de Unsplash
const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

const SRC = {
  // Tonos oscuros / negro
  negroA:   [u('photo-1539109136881-3be0616acf4b'), u('photo-1496747611176-843222e1e57c')],
  negroB:   [u('photo-1496747611176-843222e1e57c'), u('photo-1539109136881-3be0616acf4b')],
  // Tonos claros / blanco roto / crema
  blancoA:  [u('photo-1490481651871-ab68de25d43d'), u('photo-1485968579580-b6d095142e6e')],
  cremaA:   [u('photo-1485968579580-b6d095142e6e'), u('photo-1490481651871-ab68de25d43d')],
  // Tonos rosados
  rosaA:    [u('photo-1554568218-0f1715e72254'), u('photo-1509631179647-0177331693ae')],
  // Terracota / tierra
  terraA:   [u('photo-1604671368394-2240d0b1bb6c'), u('photo-1566206091558-7f218b696731')],
  // Verde sage
  sageA:    [u('photo-1469334031218-e382a71b716b'), u('photo-1576566588028-4147f3842f27')],
  // Lavanda
  lavandaA: [u('photo-1571513800374-df1bbe650e56'), u('photo-1515372039744-b8f02a3ae446')],
  // Beige
  beigeA:   [u('photo-1515886657613-9f3515b0c78f'), u('photo-1581044777550-4cfa60707c03')],
};

// ── Nuevos productos ──────────────────────────────────────────────────────────
interface NewProduct {
  slug:        string;
  title:       string;
  description: string;
  price:       number;
  tags:        string[];
  categorySlug: string;          // 'jeans' | 'blusas' | 'enterizos' | 'chaquetas'
  sizes:       Size[];
  isFeatured?: boolean;
  colors: Array<{
    paletteName:  string;          // debe coincidir con ColorPalette.name en BD
    srcImages:    string[];        // 2 URLs fuente → se suben a Cloudinary
    stockPerSize: number;
  }>;
}

const NEW_PRODUCTS: NewProduct[] = [
  {
    slug:        'blusa-corset-satinada',
    title:       'Blusa Corset Satinada',
    description: 'Blusa estilo corset en satén fluido con cierre de hebilla en la espalda. Escote recto y boning interior suave que define la silueta sin comprimir. Ideal para ocasiones especiales.',
    price:       149000,
    tags:        ['blusa', 'corset', 'saten', 'elegante'],
    categorySlug: 'blusas',
    sizes:       ['XS', 'S', 'M', 'L'],
    isFeatured:  false,
    colors: [
      { paletteName: 'Negro carbón', srcImages: SRC.negroA,   stockPerSize: 5 },
      { paletteName: 'Blanco roto',  srcImages: SRC.blancoA,  stockPerSize: 4 },
      { paletteName: 'Rosa palo',    srcImages: SRC.rosaA,    stockPerSize: 3 },
    ],
  },
  {
    slug:        'jean-barrel-leg-vintage',
    title:       'Jean Barrel Leg Vintage',
    description: 'Jean de silueta barril con detalles de lavado vintage y deshilachado en el dobladillo. Cintura alta y cadera amplia que se estrecha en el tobillo. Denim 100% algodón de peso medio.',
    price:       215000,
    tags:        ['jeans', 'denim', 'barrel-leg', 'vintage'],
    categorySlug: 'jeans',
    sizes:       ['XS', 'S', 'M', 'L', 'XL'],
    isFeatured:  false,
    colors: [
      { paletteName: 'Marrón tierra', srcImages: SRC.terraA,  stockPerSize: 6 },
      { paletteName: 'Negro carbón',  srcImages: SRC.negroB,  stockPerSize: 7 },
    ],
  },
  {
    slug:        'vestido-slip-saten',
    title:       'Vestido Slip Satén',
    description: 'Vestido slip midi en satén pesado con ajuste tipo lencería. Tirantes finos, escote recto y abertura lateral discreta. La pieza statement de la temporada.',
    price:       259000,
    tags:        ['vestido', 'slip', 'saten', 'midi'],
    categorySlug: 'enterizos',
    sizes:       ['XS', 'S', 'M', 'L'],
    isFeatured:  true,
    colors: [
      { paletteName: 'Crema',        srcImages: SRC.cremaA,   stockPerSize: 4 },
      { paletteName: 'Lavanda',      srcImages: SRC.lavandaA, stockPerSize: 3 },
      { paletteName: 'Negro carbón', srcImages: SRC.negroA,   stockPerSize: 5 },
    ],
  },
  {
    slug:        'blazer-lino-relaxed',
    title:       'Blazer Lino Relaxed',
    description: 'Blazer oversized en lino italiano sin forro. Solapa entallada, manga a tres cuartos y bolsillos de parche. Una pieza atemporal con textura natural.',
    price:       299000,
    tags:        ['chaqueta', 'blazer', 'lino', 'oversize'],
    categorySlug: 'chaquetas',
    sizes:       ['XS', 'S', 'M', 'L', 'XL'],
    isFeatured:  false,
    colors: [
      { paletteName: 'Beige', srcImages: SRC.beigeA,  stockPerSize: 5 },
      { paletteName: 'Sage',  srcImages: SRC.sageA,   stockPerSize: 4 },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function uploadToCloudinary(sourceUrl: string, publicId: string): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(sourceUrl, {
      public_id:     publicId,
      folder:        'kyzz-products',
      resource_type: 'image',
      overwrite:     false,        // no re-sube si ya existe
      transformation: [{ width: 800, height: 1066, crop: 'fill', gravity: 'auto', quality: 'auto' }],
    });
    return result.secure_url;
  } catch (err: any) {
    // Si ya existe (overwrite:false) Cloudinary lanza error; construir la URL manualmente
    if (err?.http_code === 400 || err?.message?.includes('already exists')) {
      const cloudName = cloudinary.config().cloud_name;
      return `https://res.cloudinary.com/${cloudName}/image/upload/kyzz-products/${publicId}`;
    }
    throw err;
  }
}

async function main() {
  console.log('\nSembrando nuevos productos con colores y Cloudinary...\n');

  // Cargar categorías y paleta de colores
  const categories = await prisma.category.findMany();
  const palette    = await prisma.colorPalette.findMany();

  const catMap  = Object.fromEntries(categories.map(c => [c.slug, c.id]));
  const palMap  = Object.fromEntries(palette.map(p => [p.name, p]));

  for (const def of NEW_PRODUCTS) {
    console.log(`\n▸ ${def.title} (${def.slug})`);

    // Resolver categoría
    const categoryId = catMap[def.categorySlug];
    if (!categoryId) { console.log(`  ✗ Categoría "${def.categorySlug}" no encontrada`); continue; }

    // Crear o recuperar producto (sin ProductImage, sin inStock inicial)
    let product = await prisma.product.findUnique({ where: { slug: def.slug } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          slug:        def.slug,
          title:       def.title,
          description: def.description,
          price:       def.price,
          tags:        def.tags,
          categoryId,
          isFeatured:  def.isFeatured ?? false,
          inStock:     0,   // se sincroniza al crear variantes
          sizes:       [],  // se sincroniza al crear variantes
        },
      });
      console.log(`  ✓ Producto creado`);
    } else {
      console.log(`  ~ Producto ya existía`);
      // Limpiar ProductImage residuales
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
    }

    for (const colorDef of def.colors) {
      const paletteEntry = palMap[colorDef.paletteName];
      if (!paletteEntry) {
        console.log(`  ✗ Color "${colorDef.paletteName}" no en paleta`); continue;
      }

      // Crear o recuperar ProductColor
      let pc = await prisma.productColor.findUnique({
        where: { productId_paletteColorId: { productId: product.id, paletteColorId: paletteEntry.id } },
      });
      if (!pc) {
        pc = await prisma.productColor.create({
          data: { productId: product.id, paletteColorId: paletteEntry.id },
        });
      }

      // Subir imágenes a Cloudinary (idempotente via public_id)
      console.log(`  ↑ Subiendo imágenes para "${colorDef.paletteName}"...`);
      const cloudinaryUrls: string[] = [];
      for (let i = 0; i < colorDef.srcImages.length; i++) {
        const publicId = `${def.slug}-${paletteEntry.name.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`;
        const url      = await uploadToCloudinary(colorDef.srcImages[i], publicId);
        cloudinaryUrls.push(url);
        console.log(`    → [${i + 1}] ${url.slice(0, 60)}...`);
      }

      // Reemplazar imágenes del color
      await prisma.productColorImage.deleteMany({ where: { productColorId: pc.id } });
      await prisma.productColorImage.createMany({
        data: cloudinaryUrls.map((url, idx) => ({ url, sortOrder: idx, productColorId: pc!.id })),
      });

      // Crear variantes si no existen (color × talla)
      for (const size of def.sizes) {
        const existingVariant = await prisma.productVariant.findFirst({
          where: { productId: product.id, colorId: pc.id, size },
        });
        if (!existingVariant) {
          await prisma.productVariant.create({
            data: { productId: product.id, colorId: pc.id, size, stock: colorDef.stockPerSize },
          });
        }
      }
    }

    // Sincronizar Product.inStock y Product.sizes desde variantes
    const allVariants = await prisma.productVariant.findMany({
      where: { productId: product.id }, select: { size: true, stock: true },
    });
    const totalStock  = allVariants.reduce((s, v) => s + v.stock, 0);
    const uniqueSizes = [...new Set(allVariants.map(v => v.size))];
    await prisma.product.update({
      where: { id: product.id },
      data:  { inStock: totalStock, sizes: { set: uniqueSizes } },
    });

    console.log(`  ✓ Stock sincronizado: ${totalStock} unidades, tallas: ${uniqueSizes.join(', ')}`);
  }

  console.log('\n¡Listo! Revisa los productos en /admin/products\n');
}

main()
  .catch(console.error)
  .then(() => prisma.$disconnect());
