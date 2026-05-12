"use server";

import prisma from '@/lib/prisma';
import { render } from '@react-email/components';
import { PayPalOrderStatusResponse } from '@/interfaces';
import { revalidatePath } from 'next/cache';
import { resend, EMAIL_FROM } from '@/lib/resend';
import { OrderConfirmationEmail } from '@/emails/OrderConfirmationEmail';

export const paypalCheckPayment = async (paypalOrderId: string) => {
  const authToken = await getPayPalBearerToken();
  if (!authToken) {
    return { ok: false, message: "No se pudo obtener token de verificación" };
  }

  const orderStatus = await getPayPalOrder(paypalOrderId, authToken);
  if (!orderStatus) {
    return { ok: false, message: 'Error al consultar la orden en PayPal' };
  }

  let finalOrder: PayPalOrderStatusResponse;

  if (orderStatus.status === 'COMPLETED') {
    finalOrder = orderStatus;
  } else if (orderStatus.status === 'APPROVED') {
    const captured = await capturePayPalOrder(paypalOrderId, authToken);
    if (!captured) {
      return { ok: false, message: 'Error al capturar el pago' };
    }
    if (captured.status !== 'COMPLETED') {
      return { ok: false, message: `Capture no completado (estado: ${captured.status})` };
    }
    finalOrder = captured;
  } else {
    return { ok: false, message: `Estado de pago no válido: ${orderStatus.status}` };
  }

  const { purchase_units } = finalOrder;
  // GET devuelve invoice_id en el nivel raíz; POST capture lo mueve a payments.captures[0]
  const orderId = purchase_units[0].invoice_id
    ?? purchase_units[0].payments?.captures?.[0]?.invoice_id;

  if (!orderId) {
    return { ok: false, message: 'No se pudo identificar la orden del pago' };
  }

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order)    return { ok: false, message: 'Orden no encontrada' };
    if (order.isPaid) return { ok: true };

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data:  { isPaid: true, paidAt: new Date(), shippingStatus: 'processing' },
      include: {
        user:         { select: { email: true, name: true } },
        OrderItem:    { include: { product: { select: { title: true } } } },
        OrderAddress: true,
      },
    });

    try {
      const { user, OrderItem, OrderAddress } = updatedOrder;
      if (user?.email && process.env.RESEND_API_KEY) {
        const html = await render(OrderConfirmationEmail({
          orderId,
          firstName: user.name?.split(' ')[0] ?? 'Cliente',
          items:     OrderItem.map(i => ({
            title:    i.product.title,
            size:     i.size,
            quantity: i.quantity,
            price:    i.price,
          })),
          subtotal: updatedOrder.subTotal,
          tax:      updatedOrder.tax,
          total:    updatedOrder.total,
          address:  OrderAddress?.address ?? '',
          city:     OrderAddress?.city ?? '',
        }));
        await resend.emails.send({
          from:    EMAIL_FROM,
          to:      user.email,
          subject: `KYZZ · Pago confirmado #${orderId.split('-').at(-1)?.toUpperCase()}`,
          html,
        });
      }
    } catch {
      // El email no bloquea el flujo de pago
    }

    revalidatePath(`/orders/${orderId}`);
    return { ok: true };
  } catch {
    return { ok: false, message: '500 - El pago no se pudo realizar' };
  }
};

const getPayPalBearerToken = async (): Promise<string | null> => {
  const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const PAYPAL_SECRET    = process.env.PAYPAL_SECRET;
  const oauth2Url        = process.env.PAYPAL_OAUTH_URL ?? "";

  const base64Token = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`, "utf-8").toString("base64");

  try {
    const result = await fetch(oauth2Url, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64Token}`,
      },
      body:  'grant_type=client_credentials',
      cache: 'no-store',
    }).then(r => r.json());
    return result.access_token ?? null;
  } catch {
    return null;
  }
};

const getPayPalOrder = async (
  paypalOrderId: string,
  bearerToken: string
): Promise<PayPalOrderStatusResponse | null> => {
  try {
    return await fetch(`${process.env.PAYPAL_ORDERS_URL}/${paypalOrderId}`, {
      method:  'GET',
      headers: { Authorization: `Bearer ${bearerToken}` },
      cache:   'no-store',
    }).then(r => r.json());
  } catch {
    return null;
  }
};

const capturePayPalOrder = async (
  paypalOrderId: string,
  bearerToken: string
): Promise<PayPalOrderStatusResponse | null> => {
  try {
    const resp = await fetch(`${process.env.PAYPAL_ORDERS_URL}/${paypalOrderId}/capture`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }).then(r => r.json());

    // PayPal devuelve errores como { name, details } en vez de { status }
    if (resp.name && !resp.status) return null;

    return resp;
  } catch {
    return null;
  }
};
