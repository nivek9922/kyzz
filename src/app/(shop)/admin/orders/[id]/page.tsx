import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getOrderById } from '@/actions/order/get-order-by-id';
import { getCustomerStats } from '@/actions/order/get-customer-stats';
import { currencyFormat } from '@/utils';
import { ProductImage } from '@/components';
import { titleFont } from '@/config/fonts';
import { ShippingPanel } from './ui/ShippingPanel';
import { OrderTimeline } from './ui/OrderTimeline';
import { AdminReturnButton } from './ui/AdminReturnButton';

interface Props { params: Promise<{ id: string }> }

const RETURN_STATUS_LABEL: Record<string, string> = {
  PENDING:   'En revisión',
  APPROVED:  'Aprobada',
  REJECTED:  'Rechazada',
  COMPLETED: 'Completada',
};

export default async function AdminOrderDetailPage(props: Props) {
  const params = await props.params;
  const { id } = params;
  const { ok, order } = await getOrderById(id);
  if (!ok || !order) redirect('/admin/orders');

  const customer     = await getCustomerStats({ userId: order.userId, email: order.guestEmail, excludeOrderId: id });
  const address      = order.OrderAddress!;
  const shortId      = id.split('-').at(-1)?.toUpperCase();
  const discount     = order.couponDiscount ?? 0;
  const shippingCost = order.total - order.subTotal + discount;

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
          {order.paymentGateway && (
            <span className={`text-[10px] tracking-widest uppercase px-3 py-1 border ${
              order.paymentGateway === 'wompi'
                ? 'text-blue-700 bg-blue-50 border-blue-200'
                : 'text-kyzz-muted bg-kyzz-tertiary border-kyzz-secondary'
            }`}>
              {order.paymentGateway === 'wompi' ? 'Wompi' : order.paymentGateway === 'cash' ? 'Efectivo' : 'Manual'}
            </span>
          )}
          {order.paymentMethod === 'cod' && (
            <span className="text-[10px] tracking-widest uppercase px-3 py-1 border text-orange-700 bg-orange-50 border-orange-200">
              Contraentrega
            </span>
          )}
          {order.channel !== 'web' && (
            <span className="text-[10px] tracking-widest uppercase px-3 py-1 border text-kyzz-primary bg-kyzz-tertiary border-kyzz-secondary">
              {order.channel}
            </span>
          )}
        </div>
        <div className="w-6 h-px bg-kyzz-secondary mt-3" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">

        {/* Izquierda: cliente + productos */}
        <div className="space-y-6">

          {/* Info cliente */}
          <div className="kyzz-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted">Cliente</p>
              {customer && (
                <span className={`text-[9px] tracking-widest uppercase px-2.5 py-1 border ${
                  customer.isReturning
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-kyzz-muted bg-kyzz-tertiary border-kyzz-secondary'
                }`}>
                  {customer.isReturning ? 'Recurrente' : 'Nueva clienta'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-1">Nombre</p>
                <p className="text-kyzz-dark font-medium capitalize">{address.firstName} {address.lastName}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-1">Teléfono</p>
                <p className="text-kyzz-dark">{address.phone}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-1">Email</p>
                <p className="text-kyzz-dark truncate">
                  {order.user?.email ?? order.guestEmail ?? '—'}
                  {!order.user?.email && order.guestEmail && (
                    <span className="ml-1.5 text-[9px] tracking-widest uppercase text-kyzz-muted opacity-60">invitado</span>
                  )}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-1">Dirección de entrega</p>
                <p className="text-kyzz-dark">{address.address}{address.address2 ? `, ${address.address2}` : ''}</p>
                <p className="text-kyzz-muted">{address.postalCode} {address.city} · {address.countryId}</p>
              </div>
            </div>

            {/* CRM: valor del cliente */}
            {customer && (
              <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-kyzz-secondary">
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-1">Valor (LTV)</p>
                  <p className="text-sm text-kyzz-dark font-medium">{currencyFormat(customer.totalSpent)}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-1">Órdenes pagadas</p>
                  <p className="text-sm text-kyzz-dark font-medium">
                    {customer.paidCount}
                    {customer.orderCount > customer.paidCount && (
                      <span className="text-kyzz-muted font-normal"> / {customer.orderCount} totales</span>
                    )}
                  </p>
                </div>
              </div>
            )}
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
            <div className="px-4 py-4 border-t border-kyzz-secondary">
              <div className="flex justify-between items-start gap-8">
                {/* Desglose izquierda */}
                <div className="space-y-1.5 text-[12px] text-kyzz-muted">
                  <div className="flex justify-between gap-10">
                    <span>Subtotal</span>
                    <span>{currencyFormat(order.subTotal)}</span>
                  </div>
                  <div className="flex justify-between gap-10">
                    <span>Envío</span>
                    <span className={shippingCost === 0 ? 'text-emerald-600' : ''}>
                      {shippingCost === 0 ? 'Gratis' : currencyFormat(shippingCost)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between gap-10 text-kyzz-primary">
                      <span>
                        Descuento
                        {order.couponCode && (
                          <span className="ml-1.5 font-mono text-[10px] opacity-70">{order.couponCode}</span>
                        )}
                      </span>
                      <span>−{currencyFormat(discount)}</span>
                    </div>
                  )}
                </div>
                {/* Total derecha */}
                <div className="text-right shrink-0">
                  <p className="text-[10px] tracking-widest uppercase text-kyzz-muted">Total</p>
                  <p className="text-lg font-medium text-kyzz-dark">{currencyFormat(order.total)}</p>
                  <p className="text-[10px] text-kyzz-muted mt-0.5">Incluye {currencyFormat(order.tax)} de impuestos</p>
                </div>
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
            paymentMethod={order.paymentMethod}
            codConfirmed={!!order.codConfirmedAt}
            channel={order.channel}
          />

          <OrderTimeline
            createdAt={order.createdAt}
            paidAt={order.paidAt}
            shippedAt={order.shippedAt}
            deliveredAt={order.deliveredAt}
            cancelledAt={order.cancelledAt}
            paymentMethod={order.paymentMethod}
          />

          {/* Registrar devolución manual (pedidos manuales o clientes sin cuenta) */}
          {order.shippingStatus === 'delivered' && !order.returnRequest && (
            <div className="kyzz-panel p-6 mt-6">
              <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-3">Devolución</p>
              <AdminReturnButton orderId={id} />
            </div>
          )}

          {/* Si ya hay devolución, mostrar su estado */}
          {order.returnRequest && (
            <div className="kyzz-panel p-6 mt-6 space-y-2">
              <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted">Devolución</p>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  order.returnRequest.status === 'PENDING'   ? 'bg-amber-400' :
                  order.returnRequest.status === 'APPROVED'  ? 'bg-emerald-500' :
                  order.returnRequest.status === 'REJECTED'  ? 'bg-red-400' : 'bg-kyzz-primary'
                }`} />
                <span className="text-sm text-kyzz-dark">
                  {RETURN_STATUS_LABEL[order.returnRequest.status]}
                </span>
              </div>
              <p className="text-xs text-kyzz-muted">{order.returnRequest.reason}</p>
              {order.returnRequest.returnType && (
                <p className="text-[11px] tracking-widest uppercase text-kyzz-muted">
                  {order.returnRequest.returnType === 'EXCHANGE' ? '↔ Cambio' : '$ Reembolso'}
                  {order.returnRequest.refundAmount ? ` · ${currencyFormat(order.returnRequest.refundAmount)}` : ''}
                </p>
              )}
            </div>
          )}

          {/* Panel de transacción */}
          {order.isPaid && (
            <div className="kyzz-panel p-6 mt-6 space-y-3">
              <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted">Transacción</p>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between gap-4">
                  <span className="text-kyzz-muted">Gateway</span>
                  <span className="text-kyzz-dark font-medium uppercase tracking-widest">
                    {order.paymentGateway ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-kyzz-muted shrink-0">Fecha de pago</span>
                  <span className="text-kyzz-dark text-right">
                    {order.paidAt
                      ? new Date(order.paidAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' })
                      : '—'}
                  </span>
                </div>
                {order.transactionId && !order.transactionId.startsWith('MANUAL-') && (
                  <div className="flex flex-col gap-1 pt-1 border-t border-kyzz-secondary">
                    <span className="text-kyzz-muted">Referencia</span>
                    <span className="text-kyzz-dark font-mono text-[11px] break-all">
                      {order.transactionId}
                    </span>
                  </div>
                )}
                {order.paymentProofUrl && (
                  <div className="pt-2 border-t border-kyzz-secondary">
                    <p className="text-kyzz-muted mb-2">Comprobante</p>
                    <a
                      href={order.paymentProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={order.paymentProofUrl}
                        alt="Comprobante de pago"
                        className="w-full max-w-[200px] object-cover border border-kyzz-secondary hover:opacity-80 transition-opacity"
                      />
                      <p className="text-[10px] text-kyzz-muted mt-1">Ver en tamaño completo ↗</p>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
