import { redirect } from "next/navigation";

import { getOrderById } from "@/actions/order/get-order-by-id";
import { currencyFormat } from "@/utils";
import { OrderStatus, PayPalButton, ProductImage } from "@/components";
import { titleFont } from "@/config/fonts";

interface Props {
  params: Promise<{ id: string }>;
}

const SHIPPING_STEPS = [
  { status: 'pending',    label: 'Confirmada' },
  { status: 'processing', label: 'Procesando' },
  { status: 'shipped',    label: 'En camino' },
  { status: 'delivered',  label: 'Entregada' },
];

const STEP_INDEX: Record<string, number> = {
  pending: 0, processing: 1, shipped: 2, delivered: 3, returned: -1,
};

export default async function OrdersByIdPage(props: Props) {
  const params = await props.params;
  const { id } = params;
  const { ok, order } = await getOrderById(id);

  if (!ok) redirect("/");

  const address  = order!.OrderAddress;
  const shortId  = id.split("-").at(-1)?.toUpperCase();
  const shipIdx  = order!.cancelledAt ? -2 : STEP_INDEX[order!.shippingStatus ?? 'pending'] ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">

      {/* Cabecera */}
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

      {/* Barra de progreso de envío (solo si no está cancelada) */}
      {!order!.cancelledAt && (
        <div className="mb-10">
          <div className="flex items-center gap-0">
            {SHIPPING_STEPS.map((step, i) => {
              const done    = i <= shipIdx;
              const current = i === shipIdx;
              return (
                <div key={step.status} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-center">
                    {i > 0 && (
                      <div className={`flex-1 h-px transition-colors ${done ? 'bg-kyzz-primary' : 'bg-kyzz-secondary'}`} />
                    )}
                    <div className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 transition-colors ${
                      done ? 'bg-kyzz-primary border-kyzz-primary' : 'bg-kyzz-neutral border-kyzz-secondary'
                    } ${current ? 'ring-2 ring-kyzz-primary/30' : ''}`} />
                    {i < SHIPPING_STEPS.length - 1 && (
                      <div className={`flex-1 h-px transition-colors ${i < shipIdx ? 'bg-kyzz-primary' : 'bg-kyzz-secondary'}`} />
                    )}
                  </div>
                  <p className={`text-[9px] tracking-widest uppercase text-center ${done ? 'text-kyzz-primary' : 'text-kyzz-muted'}`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Código de rastreo */}
          {order!.trackingCode && (
            <div className="mt-5 p-4 bg-kyzz-tertiary border border-kyzz-secondary text-center">
              <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-1">Código de rastreo</p>
              <p className="text-sm font-mono font-medium text-kyzz-dark">{order!.trackingCode}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

        {/* Productos */}
        <div className="space-y-0 border border-kyzz-secondary divide-y divide-kyzz-secondary">
          {order!.OrderItem.map((item) => {
            // Imagen: preferir la del color de la variante, luego legacy, luego primer color del producto
            // ProductImage ya resuelve el prefijo /products/ para URLs locales
            const resolvedImg =
              item.variant?.color?.images?.[0]?.url
              ?? item.product.ProductImage[0]?.url
              ?? item.product.ProductColors?.[0]?.images?.[0]?.url
              ?? undefined;

            // Color de la variante (solo si la variante tiene colorId)
            const variantColor = item.variant?.colorId
              ? item.variant.color?.paletteColor
              : null;
            const displayColorName = variantColor?.name ?? item.colorName ?? null;
            const displayColorHex  = variantColor?.hex ?? null;

            return (
              <div
                key={item.product.slug + "-" + item.size}
                className="flex gap-4 p-4"
              >
                <div className="shrink-0 w-20 h-24 overflow-hidden bg-kyzz-tertiary">
                  <ProductImage
                    src={resolvedImg}
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
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <p className="text-[11px] tracking-widest uppercase text-kyzz-muted">
                      Talla {item.size}
                    </p>
                    {displayColorHex && displayColorName && (
                      <>
                        <span className="text-[11px] text-kyzz-muted">·</span>
                        <span
                          className="w-3 h-3 rounded-full border border-kyzz-secondary shrink-0"
                          style={{ backgroundColor: displayColorHex }}
                        />
                        <span className="text-[11px] tracking-widest uppercase text-kyzz-muted">
                          {displayColorName}
                        </span>
                      </>
                    )}
                    {!displayColorHex && displayColorName && (
                      <>
                        <span className="text-[11px] text-kyzz-muted">·</span>
                        <span className="text-[11px] tracking-widest uppercase text-kyzz-muted">
                          {displayColorName}
                        </span>
                      </>
                    )}
                  </div>
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
            );
          })}
        </div>

        {/* Panel lateral */}
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
              <div className="border-t border-kyzz-secondary pt-4">
                <div className="flex justify-between">
                  <span className="text-[11px] tracking-widest uppercase text-kyzz-dark">Total</span>
                  <span className="text-kyzz-dark font-medium">
                    {currencyFormat(order!.total)}
                  </span>
                </div>
                <p className="text-[10px] text-kyzz-muted mt-1">
                  Incluye {currencyFormat(order!.tax)} de impuestos
                </p>
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
