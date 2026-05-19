"use server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { TAX_RATE, FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from "@/config/constants";
import type { Address, Size } from "@/interfaces";
import type { Prisma } from "@prisma/client";

interface ProductToOrder {
  productId:  string;
  variantId:  string;
  quantity:   number;
  size:       Size;
  colorName?: string;
}

export const placeOrder = async (
  productIds:  ProductToOrder[],
  address:     Address,
  couponCode?: string
) => {
  const session = await auth();
  const userId  = session?.user.id;
  const userEmail = session?.user.email?.toLowerCase();

  if (!userId) {
    return { ok: false, message: "No hay sesión de usuario" };
  }

  // ── Precios snapshot ────────────────────────────────────
  const products = await prisma.product.findMany({
    where: { id: { in: productIds.map((p) => p.productId) } },
  });

  type DbProduct = (typeof products)[number];

  const itemsInOrder = productIds.reduce((count, p) => count + p.quantity, 0);

  const { subTotal, tax } = productIds.reduce(
    (totals, item) => {
      const product = products.find((p: DbProduct) => p.id === item.productId);
      if (!product) throw new Error(`${item.productId} no existe - 500`);
      const lineSubTotal = product.price * item.quantity;
      totals.subTotal += lineSubTotal;
      totals.tax      += lineSubTotal * (TAX_RATE / (1 + TAX_RATE));
      return totals;
    },
    { subTotal: 0, tax: 0 }
  );

  const shipping = subTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;

  try {
    const prismaTx = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {

      // 1. Validar y decrementar stock
      const variantIds = productIds.map((p) => p.variantId);
      const variants   = await tx.productVariant.findMany({ where: { id: { in: variantIds } } });

      for (const item of productIds) {
        const variant = variants.find((v) => v.id === item.variantId);
        if (!variant) throw new Error(`Variante ${item.variantId} no encontrada`);
        const totalQty = productIds
          .filter((p) => p.variantId === item.variantId)
          .reduce((acc, p) => acc + p.quantity, 0);
        if (variant.stock < totalQty) {
          throw new Error(`Sin stock suficiente para ${item.size}${item.colorName ? ` · ${item.colorName}` : ''}`);
        }
      }

      const uniqueDecrement = new Map<string, number>();
      for (const item of productIds) {
        uniqueDecrement.set(item.variantId, (uniqueDecrement.get(item.variantId) ?? 0) + item.quantity);
      }

      await Promise.all(
        Array.from(uniqueDecrement.entries()).map(([variantId, qty]) =>
          tx.productVariant.update({ where: { id: variantId }, data: { stock: { decrement: qty } } })
        )
      );

      // 2. Sincronizar Product.inStock
      const affectedProductIds = Array.from(new Set(productIds.map((p) => p.productId)));
      for (const pid of affectedProductIds) {
        const agg = await tx.productVariant.aggregate({
          where: { productId: pid },
          _sum:  { stock: true },
        });
        await tx.product.update({ where: { id: pid }, data: { inStock: agg._sum.stock ?? 0 } });
      }

      // 3. Validar cupón dentro de la transacción (nunca confiar en el cliente)
      let couponDiscount = 0;
      let appliedCode:    string | undefined;
      let appliedCouponId: string | undefined;

      if (couponCode && userEmail) {
        const upper = couponCode.trim().toUpperCase();
        const coupon = await tx.coupon.findUnique({ where: { code: upper } });

        const valid =
          coupon &&
          coupon.isActive &&
          (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
          (coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit) &&
          (coupon.minimumAmount === null || subTotal >= coupon.minimumAmount);

        if (valid) {
          // Subscriber-only check
          if (coupon.subscriberOnly) {
            const sub = await tx.subscriber.findUnique({ where: { email: userEmail } });
            if (!sub?.isActive) throw new Error('Cupón exclusivo para suscriptoras del newsletter.');
          }
          // Not already used
          const used = await tx.couponRedemption.findUnique({
            where: { couponId_email: { couponId: coupon.id, email: userEmail } },
          });
          if (!used?.orderId) {
            couponDiscount = coupon.type === 'PERCENTAGE'
              ? Math.round(subTotal * (coupon.value / 100))
              : Math.min(coupon.value, subTotal);
            appliedCode     = coupon.code;
            appliedCouponId = coupon.id;
          }
        }
      }

      const total = subTotal + shipping - couponDiscount;

      // 4. Crear orden
      const order = await tx.order.create({
        data: {
          userId,
          itemsInOrder,
          subTotal,
          tax,
          total,
          couponCode:     appliedCode     ?? null,
          couponDiscount: couponDiscount,
          OrderItem: {
            createMany: {
              data: productIds.map((p) => ({
                quantity:  p.quantity,
                size:      p.size,
                productId: p.productId,
                variantId: p.variantId,
                colorName: p.colorName ?? null,
                price:     products.find((pr: DbProduct) => pr.id === p.productId)?.price ?? 0,
              })),
            },
          },
        },
      });

      // 5. Dirección
      const { country, ...restAddress } = address;
      const orderAddress = await tx.orderAddress.create({
        data: { ...restAddress, countryId: country, orderId: order.id },
      });

      // 6. Registrar redención del cupón y actualizar contador
      if (appliedCouponId && userEmail) {
        await tx.couponRedemption.upsert({
          where: { couponId_email: { couponId: appliedCouponId, email: userEmail } },
          update: { orderId: order.id, redeemedAt: new Date() },
          create: { couponId: appliedCouponId, email: userEmail, orderId: order.id },
        });
        await tx.coupon.update({
          where: { id: appliedCouponId },
          data:  { usageCount: { increment: 1 } },
        });
      }

      return { order, orderAddress };
    });

    return { ok: true, order: prismaTx.order };

  } catch (error: unknown) {
    return { ok: false, message: error instanceof Error ? error.message : 'Error desconocido' };
  }
};
