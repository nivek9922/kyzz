import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IoCheckmarkCircleOutline, IoTimeOutline, IoReceiptOutline,
  IoCloseCircleOutline, IoBicycleOutline, IoCheckmarkDoneOutline,
} from "react-icons/io5";
import { getPaginatedOrders, getCancellableOrdersCount } from "@/actions";
import { CancelExpiredOrdersButton, AdminSearchInput, Pagination } from "@/components";
import { titleFont } from "@/config/fonts";
import { currencyFormat } from "@/utils";
import { OrderFilters } from "./ui/OrderFilters";
import { SourceBadge }  from "./ui/SourceBadge";

const SHIPPING_BADGE: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pendiente',  color: 'text-kyzz-muted bg-kyzz-tertiary border-kyzz-secondary' },
  processing: { label: 'Preparando', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  shipped:    { label: 'Enviado',    color: 'text-amber-700 bg-amber-50 border-amber-200' },
  delivered:  { label: 'Entregado',  color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  returned:   { label: 'Devuelto',   color: 'text-red-600 bg-red-50 border-red-200' },
};

interface Props {
  searchParams: Promise<{
    q?:       string;
    page?:    string;
    status?:  string;
    channel?: string;
    paid?:    string;
  }>;
}

export default async function AdminOrdersPage(props: Props) {
  const searchParams = await props.searchParams;
  const query         = searchParams.q       ?? '';
  const page          = Number(searchParams.page ?? '1');
  const statusFilter  = searchParams.status  ?? 'all';
  const channelFilter = searchParams.channel ?? 'all';
  const paidFilter    = searchParams.paid    ?? 'all';

  const [{ ok, orders = [], totalPages = 1, total = 0 }, cancellableCount] = await Promise.all([
    getPaginatedOrders({ page, query, statusFilter, channelFilter, paidFilter }),
    getCancellableOrdersCount(),
  ]);
  if (!ok) redirect("/auth/login");

  return (
    <div>
      {/* Cabecera */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Admin</p>
          <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
            Pedidos
          </h1>
          <div className="w-6 h-px bg-kyzz-secondary mt-3" />
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/orders/analytics"
            className="text-[10px] tracking-widests uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors">
            Analytics →
          </Link>
          <CancelExpiredOrdersButton cancellableCount={cancellableCount} />
        </div>
      </div>

      {/* Buscador + contador */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <AdminSearchInput defaultValue={query} placeholder="Buscar por ID, cliente, email o teléfono..." />
        {total > 0 && (
          <p className="text-[11px] text-kyzz-muted shrink-0">
            {total} pedido{total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Filtros */}
      <OrderFilters
        statusFilter={statusFilter}
        channelFilter={channelFilter}
        paidFilter={paidFilter}
        query={query}
      />

      {orders.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-4 text-center border border-kyzz-secondary">
          <IoReceiptOutline className="w-8 h-8 text-kyzz-muted" />
          <p className="text-sm text-kyzz-muted">
            {query || statusFilter !== 'all' || channelFilter !== 'all' || paidFilter !== 'all'
              ? 'Sin resultados para los filtros aplicados'
              : 'Sin pedidos registrados'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-kyzz-secondary border border-kyzz-secondary">
            {/* Header */}
            <div className="hidden lg:grid grid-cols-[150px_1fr_160px_130px_110px_56px] gap-4 px-5 py-3 bg-kyzz-tertiary">
              {['Pedido', 'Cliente', 'Importe', 'Pago', 'Envío', ''].map((h, i) => (
                <p key={i} className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted">{h}</p>
              ))}
            </div>

            {orders.map((order) => {
              const shippingBadge = SHIPPING_BADGE[order.shippingStatus ?? 'pending'];
              const discount      = order.couponDiscount ?? 0;
              const shippingCost  = order.shippingCost ?? (order.total - order.subTotal + discount);
              const itemCount     = order._count.OrderItem;
              return (
                <div
                  key={order.id}
                  className={`grid grid-cols-[1fr_auto] lg:grid-cols-[150px_1fr_160px_130px_110px_56px] gap-4 items-center px-5 py-4 transition-colors ${
                    order.cancelledAt ? 'opacity-50 bg-kyzz-tertiary/30' : 'hover:bg-kyzz-tertiary/50'
                  }`}
                >
                  {/* ID + fecha + canal/método */}
                  <div>
                    <p className="text-[11px] tracking-widest font-medium text-kyzz-dark font-mono">
                      #{order.id.split('-').at(-1)?.toUpperCase()}
                    </p>
                    <p className="text-[10px] text-kyzz-muted mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', timeZone: 'America/Bogota' })}
                      {' · '}{itemCount} {itemCount === 1 ? 'producto' : 'productos'}
                    </p>
                    <div className="mt-1">
                      <SourceBadge channel={order.channel} paymentMethod={order.paymentMethod} />
                    </div>
                  </div>

                  {/* Cliente */}
                  <div className="min-w-0">
                    <p className="text-sm text-kyzz-dark truncate">
                      {order.OrderAddress?.firstName} {order.OrderAddress?.lastName}
                    </p>
                    <p className="text-[10px] text-kyzz-muted truncate">
                      {order.user?.email ?? order.guestEmail ?? '—'}
                      {!order.user?.email && order.guestEmail && (
                        <span className="ml-1 text-[9px] tracking-widest uppercase opacity-60">invitado</span>
                      )}
                    </p>
                  </div>

                  {/* Importe con desglose */}
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium text-kyzz-dark">{currencyFormat(order.total)}</p>
                    <div className="mt-0.5 space-y-px">
                      {shippingCost > 0 && (
                        <p className="text-[10px] text-kyzz-muted">+{currencyFormat(shippingCost)} envío</p>
                      )}
                      {discount > 0 && (
                        <p className="text-[10px] text-kyzz-primary">
                          −{currencyFormat(discount)}
                          {order.couponCode && (
                            <span className="ml-1 font-mono opacity-70">{order.couponCode}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badge pago */}
                  <div className="hidden lg:flex flex-col gap-1">
                    {order.cancelledAt ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-red-500 bg-red-50 border border-red-200 px-2 py-1">
                        <IoCloseCircleOutline size={11} /> Cancelada
                      </span>
                    ) : order.isPaid ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1">
                        <IoCheckmarkCircleOutline size={11} /> Pagada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-kyzz-muted bg-kyzz-tertiary border border-kyzz-secondary px-2 py-1">
                        <IoTimeOutline size={11} /> Sin pagar
                      </span>
                    )}
                    {/* Método de pago secundario */}
                    <span className="text-[9px] tracking-widest uppercase text-kyzz-muted">
                      {order.paymentMethod === 'cod' ? 'Contraentrega' : 'Pago online'}
                    </span>
                  </div>

                  {/* Badge estado de envío */}
                  <div className="hidden lg:flex">
                    {!order.cancelledAt && (
                      <span className={`inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase border px-2 py-1 ${shippingBadge.color}`}>
                        {order.shippingStatus === 'shipped'   ? <IoBicycleOutline size={11} /> :
                         order.shippingStatus === 'delivered' ? <IoCheckmarkDoneOutline size={11} /> :
                         <IoTimeOutline size={11} />}
                        {shippingBadge.label}
                      </span>
                    )}
                  </div>

                  {/* Link detalle */}
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
                  >
                    Ver →
                  </Link>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination totalPages={totalPages} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
