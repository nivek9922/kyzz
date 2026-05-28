"use server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { TAX_RATE, FREE_SHIPPING_THRESHOLD, SHIPPING_COST, COD_RESERVATION_HOURS } from "@/config/constants";
import { notifyLowStock } from "@/lib/notify-low-stock";
import { reserveStock } from "@/lib/stock-ops";
import { render } from "@react-email/components";
import { resend, EMAIL_FROM } from "@/lib/resend";
import { OrderConfirmationEmail } from "@/emails/OrderConfirmationEmail";
import { logger } from "@/lib/logger";
import type { Address, Size } from "@/interfaces";
import type { Prisma, PaymentMethod } from "@prisma/client";

interface ProductToOrder {
  productId:  string;
  variantId:  string;
  quantity:   number;
  size:       Size;
  colorName?: string;
}

export const placeOrder = async (
  productIds:    ProductToOrder[],
  address:       Address,
  couponCode?:   string,
  guestEmail?:   string,
  paymentMethod: PaymentMethod = 'prepaid',
) => {
  const session        = await auth();
  const userId         = session?.user?.id;
  const userEmail      = session?.user?.email?.toLowerCase();
  const effectiveEmail = userEmail ?? guestEmail?.toLowerCase().trim();

  if (!userId && !effectiveEmail) {
    return { ok: false, message: "Proporciona un email para continuar como invitado." };
  }

  // ── Precios snapshot ────────────────────────────────────
  const products = await prisma.product.findMany({
    where: { id: { in: productIds.map((p) => p.productId) } },
  });

  // Snapshot del stock previo (para detectar cruce de umbral y alertar al admin)
  const previousStock = new Map(products.map((p) => [p.id, p.inStock]));

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

      // 1. Reservar stock (valida disponible = stock - reserved y aumenta reserved).
      //    No descuenta stock físico: eso ocurre al despachar (commitStock).
      await reserveStock(tx, productIds.map((p) => ({ variantId: p.variantId, quantity: p.quantity })));

      // 2. Validar cupón dentro de la transacción (nunca confiar en el cliente)
      let couponDiscount = 0;
      let appliedCode:       string | undefined;
      let appliedCouponId:   string | undefined;
      let appliedUsageLimit: number | null = null;

      if (couponCode && effectiveEmail) {
        const upper  = couponCode.trim().toUpperCase();
        const coupon = await tx.coupon.findUnique({ where: { code: upper } });

        const valid =
          coupon &&
          coupon.isActive &&
          (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
          (coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit) &&
          (coupon.minimumAmount === null || subTotal >= coupon.minimumAmount);

        if (valid) {
          if (coupon.subscriberOnly) {
            const sub = await tx.subscriber.findUnique({ where: { email: effectiveEmail } });
            if (!sub?.isActive) throw new Error('Cupón exclusivo para suscriptoras del newsletter.');
          }
          const used = await tx.couponRedemption.findUnique({
            where: { couponId_email: { couponId: coupon.id, email: effectiveEmail } },
          });
          if (!used?.orderId) {
            couponDiscount  = coupon.type === 'PERCENTAGE'
              ? Math.round(subTotal * (coupon.value / 100))
              : Math.min(coupon.value, subTotal);
            appliedCode       = coupon.code;
            appliedCouponId   = coupon.id;
            appliedUsageLimit = coupon.usageLimit;
          }
        }
      }

      const total = subTotal + shipping - couponDiscount;

      // COD: la reserva expira si el equipo no confirma el pedido a tiempo.
      // Prepaid: la cancelación la maneja el cron de 24h por createdAt.
      const reservationExpiresAt = paymentMethod === 'cod'
        ? new Date(Date.now() + COD_RESERVATION_HOURS * 60 * 60 * 1000)
        : null;

      // 3. Crear orden
      const order = await tx.order.create({
        data: {
          userId:         userId ?? null,
          guestEmail:     userId ? null : (effectiveEmail ?? null),
          itemsInOrder,
          subTotal,
          tax,
          total,
          paymentMethod,
          reservationExpiresAt,
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

      // 6. Registrar redención del cupón
      if (appliedCouponId && effectiveEmail) {
        await tx.couponRedemption.upsert({
          where:  { couponId_email: { couponId: appliedCouponId, email: effectiveEmail } },
          update: { orderId: order.id, redeemedAt: new Date() },
          create: { couponId: appliedCouponId, email: effectiveEmail, orderId: order.id },
        });
        // Incremento atómico: el WHERE incluye el límite para que la BD lo
        // imponga bajo concurrencia (el row-lock serializa transacciones
        // simultáneas → evita TOCTOU sobre usageCount). Si ya se alcanzó el
        // límite, count === 0 y revertimos toda la orden.
        const incremented = await tx.coupon.updateMany({
          where: {
            id: appliedCouponId,
            ...(appliedUsageLimit !== null ? { usageCount: { lt: appliedUsageLimit } } : {}),
          },
          data: { usageCount: { increment: 1 } },
        });
        if (incremented.count === 0) {
          throw new Error('El cupón alcanzó su límite de uso.');
        }
      }

      return { order, orderAddress };
    });

    // Alerta de stock bajo al admin (no afecta el resultado de la orden)
    await notifyLowStock(previousStock);

    // Email de confirmación para COD. El prepaid lo envía el webhook de Wompi tras el pago.
    if (paymentMethod === 'cod' && effectiveEmail && process.env.RESEND_API_KEY) {
      try {
        const html = await render(OrderConfirmationEmail({
          orderId:   prismaTx.order.id,
          firstName: address.firstName,
          items:     productIds.map((p) => {
            const prod = products.find((pr) => pr.id === p.productId);
            return { title: prod?.title ?? 'Producto', size: p.size, quantity: p.quantity, price: prod?.price ?? 0 };
          }),
          subtotal: prismaTx.order.subTotal,
          tax:      prismaTx.order.tax,
          total:    prismaTx.order.total,
          address:  address.address,
          city:     address.city,
        }));
        await resend.emails.send({
          from:    EMAIL_FROM,
          to:      effectiveEmail,
          subject: `KYZZ · Pedido recibido #${prismaTx.order.id.split('-').at(-1)?.toUpperCase()}`,
          html,
        });
      } catch (emailErr) {
        logger.error({ orderId: prismaTx.order.id, error: String(emailErr) }, 'COD: error enviando email de confirmación');
      }
    }

    return { ok: true, order: prismaTx.order };

  } catch (error: unknown) {
    return { ok: false, message: error instanceof Error ? error.message : 'Error desconocido' };
  }
};
