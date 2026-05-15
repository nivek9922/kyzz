"use server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { TAX_RATE } from "@/config/constants";
import type { Address, Size } from "@/interfaces";
import type { Prisma } from "@prisma/client";

interface ProductToOrder {
  productId:  string;
  variantId:  string;     // requerido: identifica exactamente la combinación (color×talla)
  quantity:   number;
  size:       Size;
  colorName?: string;
}

export const placeOrder = async (
  productIds: ProductToOrder[],
  address: Address
) => {
  const session = await auth();
  const userId = session?.user.id;

  if (!userId) {
    return { ok: false, message: "No hay sesión de usuario" };
  }

  // ── Cargar productos para precios (snapshot) ──
  const products = await prisma.product.findMany({
    where: { id: { in: productIds.map((p) => p.productId) } },
  });

  type DbProduct = (typeof products)[number];

  const itemsInOrder = productIds.reduce((count, p) => count + p.quantity, 0);

  const { subTotal, tax, total } = productIds.reduce(
    (totals, item) => {
      const product = products.find((p: DbProduct) => p.id === item.productId);
      if (!product) throw new Error(`${item.productId} no existe - 500`);
      const lineSubTotal = product.price * item.quantity;
      totals.subTotal += lineSubTotal;
      totals.tax      += lineSubTotal * TAX_RATE;
      totals.total    += lineSubTotal * (1 + TAX_RATE);
      return totals;
    },
    { subTotal: 0, tax: 0, total: 0 }
  );

  try {
    const prismaTx = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {

      // 1. Decrementar stock de cada variante y verificar disponibilidad
      const variantIds = productIds.map((p) => p.variantId);
      const variants   = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
      });

      // Validar que cada variante existe y tiene stock suficiente
      for (const item of productIds) {
        const variant = variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new Error(`Variante ${item.variantId} no encontrada`);
        }
        // Sumar cantidad pedida de esta variante (puede aparecer dos veces si por algún motivo se duplicó)
        const totalQty = productIds
          .filter((p) => p.variantId === item.variantId)
          .reduce((acc, p) => acc + p.quantity, 0);
        if (variant.stock < totalQty) {
          throw new Error(`Sin stock suficiente para ${item.size}${item.colorName ? ` · ${item.colorName}` : ''}`);
        }
      }

      // Decrementar (atómico por variante)
      const uniqueDecrement = new Map<string, number>();
      for (const item of productIds) {
        uniqueDecrement.set(item.variantId, (uniqueDecrement.get(item.variantId) ?? 0) + item.quantity);
      }

      await Promise.all(
        Array.from(uniqueDecrement.entries()).map(([variantId, qty]) =>
          tx.productVariant.update({
            where: { id: variantId },
            data:  { stock: { decrement: qty } },
          })
        )
      );

      // 2. Sincronizar Product.inStock (suma de stock de variantes del producto)
      const affectedProductIds = Array.from(new Set(productIds.map((p) => p.productId)));
      for (const pid of affectedProductIds) {
        const agg = await tx.productVariant.aggregate({
          where:  { productId: pid },
          _sum:   { stock: true },
        });
        await tx.product.update({
          where: { id: pid },
          data:  { inStock: agg._sum.stock ?? 0 },
        });
      }

      // 3. Crear la orden + items
      const order = await tx.order.create({
        data: {
          userId,
          itemsInOrder,
          subTotal,
          tax,
          total,
          OrderItem: {
            createMany: {
              data: productIds.map((p) => ({
                quantity:  p.quantity,
                size:      p.size,
                productId: p.productId,
                variantId: p.variantId,
                colorName: p.colorName ?? null,
                price:
                  products.find((product: DbProduct) => product.id === p.productId)?.price ?? 0,
              })),
            },
          },
        },
      });

      // 4. Dirección
      const { country, ...restAddress } = address;
      const orderAddress = await tx.orderAddress.create({
        data: {
          ...restAddress,
          countryId: country,
          orderId:   order.id,
        },
      });

      return { order, orderAddress };
    });

    return {
      ok: true,
      order: prismaTx.order,
      prismaTx: prismaTx,
    };

  } catch (error: any) {
    return {
      ok: false,
      message: error?.message,
    };
  }
};
