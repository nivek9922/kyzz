import type { Prisma } from '@prisma/client';

/**
 * Operaciones centralizadas del modelo de stock reservado.
 *
 *   available = stock - reserved
 *   stock     = unidades físicas en bodega
 *   reserved  = comprometidas por órdenes activas (no canceladas, no despachadas)
 *
 * Ciclo de vida: reservar (al crear) → comprometer (al despachar) → o liberar
 * (al cancelar/expirar/rechazar). Todas las funciones reciben un cliente de
 * transacción (`tx`) y deben llamarse dentro de `prisma.$transaction`.
 */

export interface StockLineItem {
  variantId: string;
  quantity:  number;
}

/** Agrega cantidades por variante (deduplica líneas repetidas del mismo variant). */
function aggregateByVariant(items: StockLineItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const it of items) {
    if (!it.variantId) continue;
    map.set(it.variantId, (map.get(it.variantId) ?? 0) + it.quantity);
  }
  return map;
}

/** Recalcula Product.inStock = Σ(stock - reserved) para los productos dados. */
export async function syncProductInStock(tx: Prisma.TransactionClient, productIds: string[]) {
  const ids = Array.from(new Set(productIds));
  for (const pid of ids) {
    const agg = await tx.productVariant.aggregate({
      where: { productId: pid },
      _sum:  { stock: true, reserved: true },
    });
    const available = (agg._sum.stock ?? 0) - (agg._sum.reserved ?? 0);
    await tx.product.update({ where: { id: pid }, data: { inStock: available } });
  }
}

/**
 * Reserva stock para una orden nueva: valida `available >= qty` por variante y
 * aumenta `reserved`. Lanza si no hay disponible suficiente (revierte la tx).
 */
export async function reserveStock(tx: Prisma.TransactionClient, items: StockLineItem[]) {
  const byVariant = aggregateByVariant(items);
  if (byVariant.size === 0) return;

  const variants = await tx.productVariant.findMany({
    where:  { id: { in: Array.from(byVariant.keys()) } },
    select: { id: true, stock: true, reserved: true, size: true, productId: true },
  });

  for (const [variantId, qty] of byVariant) {
    const v = variants.find((x) => x.id === variantId);
    if (!v) throw new Error(`Variante ${variantId} no encontrada`);
    const available = v.stock - v.reserved;
    if (available < qty) {
      throw new Error(`Sin stock suficiente para la talla ${v.size}`);
    }
  }

  await Promise.all(
    Array.from(byVariant.entries()).map(([variantId, qty]) =>
      tx.productVariant.update({ where: { id: variantId }, data: { reserved: { increment: qty } } }),
    ),
  );

  await syncProductInStock(tx, variants.map((v) => v.productId));
}

/**
 * Comprometе stock al despachar: la mercancía sale físicamente de bodega.
 * `stock -= qty` y `reserved -= qty` (available no cambia).
 */
export async function commitStock(tx: Prisma.TransactionClient, items: StockLineItem[]) {
  const byVariant = aggregateByVariant(items);
  if (byVariant.size === 0) return;

  const variants = await tx.productVariant.findMany({
    where:  { id: { in: Array.from(byVariant.keys()) } },
    select: { id: true, productId: true },
  });

  await Promise.all(
    Array.from(byVariant.entries()).map(([variantId, qty]) =>
      tx.productVariant.update({
        where: { id: variantId },
        data:  { stock: { decrement: qty }, reserved: { decrement: qty } },
      }),
    ),
  );

  await syncProductInStock(tx, variants.map((v) => v.productId));
}

/**
 * Restaura stock físico al completar una devolución: el producto vuelve a bodega.
 * `stock += qty` — distinto de releaseStock, que solo libera reservas.
 * La reserved no se toca porque ya fue commiteada al despachar.
 */
export async function restoreStock(tx: Prisma.TransactionClient, items: StockLineItem[]) {
  const byVariant = aggregateByVariant(items);
  if (byVariant.size === 0) return;

  const variants = await tx.productVariant.findMany({
    where:  { id: { in: Array.from(byVariant.keys()) } },
    select: { id: true, productId: true },
  });

  await Promise.all(
    Array.from(byVariant.entries()).map(([variantId, qty]) =>
      tx.productVariant.update({ where: { id: variantId }, data: { stock: { increment: qty } } }),
    ),
  );

  await syncProductInStock(tx, variants.map((v) => v.productId));
}

/**
 * Libera la reserva (cancelación / expiración / rechazo): `reserved -= qty`.
 * El stock físico no se toca — la mercancía nunca salió de bodega.
 */
export async function releaseStock(tx: Prisma.TransactionClient, items: StockLineItem[]) {
  const byVariant = aggregateByVariant(items);
  if (byVariant.size === 0) return;

  const variants = await tx.productVariant.findMany({
    where:  { id: { in: Array.from(byVariant.keys()) } },
    select: { id: true, productId: true },
  });

  await Promise.all(
    Array.from(byVariant.entries()).map(([variantId, qty]) =>
      tx.productVariant.update({ where: { id: variantId }, data: { reserved: { decrement: qty } } }),
    ),
  );

  await syncProductInStock(tx, variants.map((v) => v.productId));
}
