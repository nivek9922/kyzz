import type { Prisma, InventoryAction } from '@prisma/client';

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
 * Reserva stock para una orden nueva. Usa un UPDATE condicional atómico para
 * evitar la race condition entre pedidos concurrentes:
 *   UPDATE SET reserved += qty WHERE (stock - reserved) >= qty
 * El UPDATE adquiere un row-lock exclusivo en PostgreSQL — si dos transacciones
 * compiten por la misma variante, la segunda espera a que la primera haga commit
 * y luego re-evalúa el WHERE con el valor actualizado. Sin ventana de TOCTOU.
 */
export async function reserveStock(tx: Prisma.TransactionClient, items: StockLineItem[]) {
  const byVariant = aggregateByVariant(items);
  if (byVariant.size === 0) return;

  // Pre-fetch solo para labels de error y productIds — no para la verificación de stock.
  const variantMeta = await tx.productVariant.findMany({
    where:  { id: { in: Array.from(byVariant.keys()) } },
    select: { id: true, size: true, productId: true },
  });

  for (const [variantId, qty] of byVariant) {
    const meta = variantMeta.find((v) => v.id === variantId);
    if (!meta) throw new Error(`Variante ${variantId} no encontrada`);

    // Atomic check-and-increment: el WHERE evalúa disponible DENTRO del lock de fila.
    // Si otra tx ya reservó parte del stock, este UPDATE leerá el reserved actualizado.
    // NOTA: la columna id es `text` (Prisma String) — NO castear a ::uuid o falla
    // con "operator does not exist: text = uuid" (código 42883).
    const affected = await tx.$executeRaw`
      UPDATE "ProductVariant"
      SET    reserved = reserved + ${qty}
      WHERE  id = ${variantId}
        AND  (stock - reserved) >= ${qty}
    `;

    if (affected === 0) {
      throw new Error(`Sin stock suficiente para la talla ${meta.size}`);
    }
  }

  await syncProductInStock(tx, variantMeta.map((v) => v.productId));
}

/**
 * Comprometе stock al despachar: la mercancía sale físicamente de bodega.
 * `stock -= qty` y `reserved -= qty` (available no cambia).
 * GREATEST(..., 0) garantiza que ni stock ni reserved bajen de 0 aunque haya
 * un doble-commit o datos inconsistentes — nunca se corrompen los valores.
 */
export async function commitStock(tx: Prisma.TransactionClient, items: StockLineItem[]) {
  const byVariant = aggregateByVariant(items);
  if (byVariant.size === 0) return;

  const variants = await tx.productVariant.findMany({
    where:  { id: { in: Array.from(byVariant.keys()) } },
    select: { id: true, productId: true },
  });

  for (const [variantId, qty] of byVariant) {
    await tx.$executeRaw`
      UPDATE "ProductVariant"
      SET    stock    = GREATEST(stock - ${qty}, 0),
             reserved = GREATEST(reserved - ${qty}, 0)
      WHERE  id = ${variantId}
    `;
  }

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
 * GREATEST(reserved - qty, 0) evita que una doble-liberación deje reserved < 0
 * (que infla artificialmente el disponible y permite sobreventa).
 */
export async function releaseStock(tx: Prisma.TransactionClient, items: StockLineItem[]) {
  const byVariant = aggregateByVariant(items);
  if (byVariant.size === 0) return;

  const variants = await tx.productVariant.findMany({
    where:  { id: { in: Array.from(byVariant.keys()) } },
    select: { id: true, productId: true },
  });

  for (const [variantId, qty] of byVariant) {
    await tx.$executeRaw`
      UPDATE "ProductVariant"
      SET    reserved = GREATEST(reserved - ${qty}, 0)
      WHERE  id = ${variantId}
    `;
  }

  await syncProductInStock(tx, variants.map((v) => v.productId));
}

export interface QuarantineLineItem {
  variantId: string;
  quantity:  number;
}

/**
 * Mueve unidades a cuarentena al recibir físicamente una devolución.
 * El producto está en bodega KYZZ pero aún no es vendible — la inspección
 * decidirá si vuelve a stock o se da de baja como dañado.
 * NO toca `stock` ni `reserved`: `available` no cambia.
 */
export async function quarantineStock(
  tx: Prisma.TransactionClient,
  items: QuarantineLineItem[],
) {
  const byVariant = aggregateByVariant(items);
  if (byVariant.size === 0) return;

  const variants = await tx.productVariant.findMany({
    where:  { id: { in: Array.from(byVariant.keys()) } },
    select: { id: true, productId: true },
  });

  for (const [variantId, qty] of byVariant) {
    await tx.$executeRaw`
      UPDATE "ProductVariant"
      SET quarantined = quarantined + ${qty}
      WHERE id = ${variantId}
    `;
  }

  await syncProductInStock(tx, variants.map((v) => v.productId));
}

export interface ReleaseItem {
  variantId: string;
  quantity:  number;
  action:    InventoryAction;
}

/**
 * Libera unidades de cuarentena tras la inspección física.
 *
 * RESTOCK → quarantined -= qty, stock += qty   (vuelve a disponible)
 * Todo lo demás → quarantined -= qty, damaged += qty (fuera del ciclo normal)
 */
export async function releaseFromQuarantine(
  tx:    Prisma.TransactionClient,
  items: ReleaseItem[],
) {
  if (items.length === 0) return;

  const variantRows = await tx.productVariant.findMany({
    where:  { id: { in: items.map((i) => i.variantId) } },
    select: { id: true, productId: true },
  });
  const pidByVariant = new Map(variantRows.map((v) => [v.id, v.productId]));
  const productIds   = Array.from(new Set(variantRows.map((v) => v.productId)));

  for (const item of items) {
    if (!pidByVariant.has(item.variantId)) continue;

    if (item.action === 'RESTOCK') {
      await tx.$executeRaw`
        UPDATE "ProductVariant"
        SET quarantined = GREATEST(quarantined - ${item.quantity}, 0),
            stock       = stock + ${item.quantity}
        WHERE id = ${item.variantId}
      `;
    } else {
      // LIQUIDATE / DONATE / DESTROY / QUARANTINE → sale de cuarentena, se registra como dañado
      await tx.$executeRaw`
        UPDATE "ProductVariant"
        SET quarantined = GREATEST(quarantined - ${item.quantity}, 0),
            damaged     = damaged + ${item.quantity}
        WHERE id = ${item.variantId}
      `;
    }
  }

  await syncProductInStock(tx, productIds);
}
