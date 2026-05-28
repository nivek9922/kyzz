'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { Size } from '@prisma/client';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

const variantInputSchema = z.object({
  id:      z.string().uuid().optional(),
  colorId: z.string().uuid().nullable(),
  size:    z.nativeEnum(Size),
  stock:   z.number().int().min(0),
  sku:     z.string().trim().min(1).max(64).nullable().optional(),
});

const updateSchema = z.object({
  productId: z.string().uuid(),
  variants:  z.array(variantInputSchema),
});

export type VariantInput = z.infer<typeof variantInputSchema>;

// ─── Obtener todas las variantes de un producto ──────────────────────────────
export async function getProductVariants(productId: string) {
  return prisma.productVariant.findMany({
    where: { productId },
    include: {
      color: {
        include: { paletteColor: true },
      },
    },
    orderBy: [
      { colorId: 'asc' },
      { size:    'asc' },
    ],
  });
}

// ─── Actualizar set completo de variantes (upsert + delete extras) ───────────
//
// Estrategia: el cliente envía el set final. Diffeamos contra BD:
//  - Variantes con id existente → update stock/sku
//  - Variantes sin id → create
//  - Variantes en BD que no vienen en el set → delete
// Todo dentro de una transacción para atomicidad.
export async function updateProductVariants(input: {
  productId: string;
  variants:  VariantInput[];
}) {
  const session = await auth();
  if (session?.user.role !== 'admin') return { ok: false, error: 'No autorizado' };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const { productId, variants } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.productVariant.findMany({
        where: { productId },
        select: { id: true },
      });

      const incomingIds = new Set(variants.filter((v) => v.id).map((v) => v.id!));
      const toDelete   = existing.filter((v) => !incomingIds.has(v.id)).map((v) => v.id);

      if (toDelete.length > 0) {
        await tx.productVariant.deleteMany({ where: { id: { in: toDelete } } });
      }

      for (const v of variants) {
        if (v.id) {
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              colorId: v.colorId,
              size:    v.size,
              stock:   v.stock,
              sku:     v.sku ?? null,
            },
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId,
              colorId: v.colorId,
              size:    v.size,
              stock:   v.stock,
              sku:     v.sku ?? null,
            },
          });
        }
      }

      // Sincronizar campos legacy en Product (inStock + sizes) desde variantes.
      // inStock = disponible = Σ(stock - reserved) — coherente con el modelo reservado.
      const allVariants = await tx.productVariant.findMany({
        where:  { productId },
        select: { size: true, stock: true, reserved: true },
      });
      const available   = allVariants.reduce((sum, v) => sum + (v.stock - v.reserved), 0);
      const uniqueSizes  = Array.from(new Set(allVariants.map((v) => v.size)));

      const product = await tx.product.update({
        where: { id: productId },
        data:  {
          inStock: available,
          sizes:   { set: uniqueSizes },
        },
        select: { slug: true },
      });

      return { slug: product.slug };
    });

    revalidatePath(`/admin/product/${result.slug}`);
    revalidatePath(`/product/${result.slug}`);
    revalidatePath('/products');
    revalidateTag(`product:${result.slug}`);

    return { ok: true };
  } catch (error) {
    console.error(error);
    return { ok: false, error: 'No se pudieron guardar las variantes' };
  }
}

// ─── Resolver una variante a partir de (productId, colorId|null, size) ──────
// Usado por AddToCart para obtener el variantId que se guarda en el carrito.
export async function resolveVariant(input: {
  productId: string;
  colorId:   string | null;
  size:      Size;
}) {
  // findFirst en vez de findUnique porque el composite unique no acepta colorId=null
  // (PostgreSQL trata NULL como distinto de NULL en uniqueness).
  return prisma.productVariant.findFirst({
    where: {
      productId: input.productId,
      colorId:   input.colorId,
      size:      input.size,
    },
    select: { id: true, stock: true },
  });
}
