import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrderById } from '@/actions/order/get-order-by-id';
import { currencyFormat } from '@/utils';
import { ProductImage } from '@/components';
import { titleFont } from '@/config/fonts';
import { ShippingPanel } from './ui/ShippingPanel';

interface Props { params: Promise<{ id: string }> }

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', processing: 'Procesando', shipped: 'Enviado', delivered: 'Entregado', returned: 'Devuelto',
};

export default async function AdminOrderDetailPage(props: Props) {
  const params = await props.params;
  const { id } = params;
  const { ok, order } = await getOrderById(id);
  if (!ok || !order) redirect('/admin/orders');

  const address  = order.OrderAddress!;
  const shortId  = id.split('-').at(-1)?.toUpperCase();

  return (
    <div>
      {/* Cabecera */}
      <div className="mb-8">
        <Link href="/admin/orders" className="text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors">
          ← Volver a pedidos
        </Link>
        <div className="flex items-center gap-4 mt-3">
          <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
            Pedido #{shortId}
          </h1>
          <span className={`text-[10px] tracking-widest uppercase px-3 py-1 border ${order.isPaid ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : order.cancelledAt ? 'text-red-500 bg-red-50 border-red-200' : 'text-kyzz-muted bg-kyzz-tertiary border-kyzz-secondary'}`}>
            {order.cancelledAt ? 'Cancelada' : order.isPaid ? 'Pagada' : 'Sin pagar'}
          </span>
        </div>
        <div className="w-6 h-px bg-kyzz-secondary mt-3" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">

        {/* Izquierda: cliente + productos */}
        <div className="space-y-6">

          {/* Info cliente */}
          <div className="kyzz-panel p-6">
            <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-4">Cliente</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-1">Nombre</p>
                <p className="text-kyzz-dark font-medium capitalize">{address.firstName} {address.lastName}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-1">Teléfono</p>
                <p className="text-kyzz-dark">{address.phone}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-1">Dirección de entrega</p>
                <p className="text-kyzz-dark">{address.address}{address.address2 ? `, ${address.address2}` : ''}</p>
                <p className="text-kyzz-muted">{address.postalCode} {address.city} · {address.countryId}</p>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div className="border border-kyzz-secondary divide-y divide-kyzz-secondary">
            <div className="px-4 py-3 bg-kyzz-tertiary">
              <p className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted">Productos ({order.itemsInOrder})</p>
            </div>
            {order.OrderItem.map((item) => {
              // Imagen: variante con color → legacy → primer color del producto
              // ProductImage ya resuelve el prefijo /products/ para URLs locales
              const resolvedImg =
                item.variant?.color?.images?.[0]?.url
                ?? item.product.ProductImage[0]?.url
                ?? item.product.ProductColors?.[0]?.images?.[0]?.url
                ?? undefined;

              // Color solo cuando la variante tiene colorId
              const variantColor     = item.variant?.colorId ? item.variant.color?.paletteColor : null;
              const displayColorName = variantColor?.name ?? item.colorName ?? null;
              const displayColorHex  = variantColor?.hex ?? null;

              return (
                <div key={item.product.slug + item.size} className="flex gap-4 p-4">
                  <div className="shrink-0 w-16 h-20 overflow-hidden bg-kyzz-tertiary">
                    <ProductImage
                      src={resolvedImg}
                      alt={item.product.title}
                      width={64}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-kyzz-dark truncate">{item.product.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <p className="text-[11px] tracking-widest uppercase text-kyzz-muted">Talla {item.size}</p>
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
                    <p className="text-xs text-kyzz-muted mt-1">{currencyFormat(item.price)} × {item.quantity}</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-kyzz-dark">{currencyFormat(item.price * item.quantity)}</p>
                </div>
              );
            })}
            <div className="px-4 py-4 flex justify-between items-center">
              <div className="space-y-1 text-sm text-kyzz-muted">
                <div className="flex gap-8"><span>Subtotal</span><span>{currencyFormat(order.subTotal)}</span></div>
              </div>
              <div className="text-right">
                <p className="text-[10px] tracking-widest uppercase text-kyzz-muted">Total</p>
                <p className="text-lg font-medium text-kyzz-dark">{currencyFormat(order.total)}</p>
                <p className="text-[10px] text-kyzz-muted mt-0.5">Incluye {currencyFormat(order.tax)} de impuestos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Derecha: panel de envío */}
        <div>
          <ShippingPanel
            orderId={id}
            currentStatus={order.shippingStatus}
            currentTracking={order.trackingCode ?? null}
            currentNotes={order.shippingNotes ?? null}
            isPaid={order.isPaid}
            isCancelled={!!order.cancelledAt}
          />
        </div>
      </div>
    </div>
  );
}
