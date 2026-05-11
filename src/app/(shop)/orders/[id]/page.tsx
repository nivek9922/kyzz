import { redirect } from "next/navigation";

import { getOrderById } from "@/actions/order/get-order-by-id";
import { currencyFormat } from "@/utils";
import { OrderStatus, PayPalButton, ProductImage } from "@/components";
import { titleFont } from "@/config/fonts";

interface Props {
  params: { id: string };
}

export default async function OrdersByIdPage({ params }: Props) {
  const { id } = params;
  const { ok, order } = await getOrderById(id);

  if (!ok) redirect("/");

  const address = order!.OrderAddress;
  const shortId = id.split("-").at(-1)?.toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">

      {/* ── Cabecera ─────────────────────────────────────────── */}
      <div className="mb-10">
        <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-3">
          Mi cuenta · Pedidos
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
            Orden #{shortId}
          </h1>
          <OrderStatus isPaid={order?.isPaid ?? false} cancelledAt={order?.cancelledAt} />
        </div>
        <div className="w-8 h-px bg-kyzz-secondary mt-5" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

        {/* ── Productos ──────────────────────────────────────── */}
        <div className="space-y-0 border border-kyzz-secondary divide-y divide-kyzz-secondary">
          {order!.OrderItem.map((item) => (
            <div
              key={item.product.slug + "-" + item.size}
              className="flex gap-4 p-4"
            >
              <div className="shrink-0 w-20 h-24 overflow-hidden bg-kyzz-tertiary">
                <ProductImage
                  src={item.product.ProductImage[0]?.url}
                  alt={item.product.title}
                  width={80}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-kyzz-dark font-medium truncate">
                  {item.product.title}
                </p>
                <p className="text-[11px] tracking-widest uppercase text-kyzz-muted mt-0.5">
                  Talla {item.size}
                </p>
                <p className="text-xs text-kyzz-muted mt-1">
                  {currencyFormat(item.price)} × {item.quantity}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm text-kyzz-dark font-medium">
                  {currencyFormat(item.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Panel lateral ──────────────────────────────────── */}
        <div className="space-y-6">

          {/* Dirección */}
          <div className="kyzz-panel p-6">
            <p className="text-[11px] tracking-[0.25em] uppercase text-kyzz-muted mb-4">
              Dirección de entrega
            </p>
            <div className="space-y-0.5 text-sm">
              <p className="text-kyzz-dark font-medium capitalize">
                {address!.firstName} {address!.lastName}
              </p>
              <p className="text-kyzz-muted">{address!.address}</p>
              {address!.address2 && (
                <p className="text-kyzz-muted">{address!.address2}</p>
              )}
              <p className="text-kyzz-muted">
                {address!.postalCode} {address!.city}
              </p>
              <p className="text-kyzz-muted">{address!.countryId}</p>
              <p className="text-kyzz-muted pt-1">{address!.phone}</p>
            </div>
          </div>

          {/* Resumen */}
          <div className="kyzz-panel p-6">
            <p className="text-[11px] tracking-[0.25em] uppercase text-kyzz-muted mb-5">
              Resumen de orden
            </p>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-kyzz-muted">
                <span>Productos</span>
                <span>
                  {order?.itemsInOrder === 1
                    ? "1 artículo"
                    : `${order?.itemsInOrder} artículos`}
                </span>
              </div>
              <div className="flex justify-between text-kyzz-muted">
                <span>Subtotal</span>
                <span>{currencyFormat(order!.subTotal)}</span>
              </div>
              <div className="flex justify-between text-kyzz-muted">
                <span>Impuestos (15%)</span>
                <span>{currencyFormat(order!.tax)}</span>
              </div>
              <div className="border-t border-kyzz-secondary pt-4 flex justify-between">
                <span className="text-[11px] tracking-widest uppercase text-kyzz-dark">Total</span>
                <span className="text-kyzz-dark font-medium">
                  {currencyFormat(order!.total)}
                </span>
              </div>
            </div>

            <div className="mt-6">
              {order?.cancelledAt ? (
                <p className="text-[11px] tracking-widest uppercase text-kyzz-muted">
                  Esta orden fue cancelada por falta de pago.
                </p>
              ) : order?.isPaid ? (
                <OrderStatus isPaid={true} />
              ) : (
                <PayPalButton amount={order!.total} orderId={order!.id} />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
