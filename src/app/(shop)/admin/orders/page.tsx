export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { IoCheckmarkCircleOutline, IoTimeOutline, IoReceiptOutline, IoCloseCircleOutline } from "react-icons/io5";
import { getPaginatedOrders, getCancellableOrdersCount } from "@/actions";
import { CancelExpiredOrdersButton } from "@/components";
import { titleFont } from "@/config/fonts";
import { currencyFormat } from "@/utils";

export default async function AdminOrdersPage() {
  const [{ ok, orders = [] }, cancellableCount] = await Promise.all([
    getPaginatedOrders(),
    getCancellableOrdersCount(),
  ]);
  if (!ok) redirect("/auth/login");

  return (
    <div>
      {/* Cabecera */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Admin</p>
          <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
            Pedidos
          </h1>
          <div className="w-6 h-px bg-kyzz-secondary mt-3" />
        </div>
        <CancelExpiredOrdersButton cancellableCount={cancellableCount} />
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-4 text-center border border-kyzz-secondary">
          <IoReceiptOutline className="w-8 h-8 text-kyzz-muted" />
          <p className="text-sm text-kyzz-muted">Sin pedidos registrados</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-kyzz-secondary border border-kyzz-secondary">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[100px_1fr_120px_110px_60px] gap-4 px-5 py-3 bg-kyzz-tertiary">
            {['Pedido', 'Cliente', 'Total', 'Estado', ''].map((h, i) => (
              <p key={i} className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted">{h}</p>
            ))}
          </div>

          {orders.map((order) => (
            <div
              key={order.id}
              className={`grid grid-cols-[1fr_auto] md:grid-cols-[100px_1fr_120px_110px_60px] gap-4 items-center px-5 py-4 transition-colors ${
                order.cancelledAt
                  ? 'opacity-50 bg-kyzz-tertiary/30'
                  : 'hover:bg-kyzz-tertiary/50'
              }`}
            >
              {/* ID */}
              <p className="text-[11px] tracking-widest font-medium text-kyzz-dark font-mono">
                #{order.id.split('-').at(-1)?.toUpperCase()}
              </p>

              {/* Cliente */}
              <p className="text-sm text-kyzz-dark truncate">
                {order.OrderAddress?.firstName} {order.OrderAddress?.lastName}
              </p>

              {/* Total */}
              <p className="hidden md:block text-sm font-medium text-kyzz-dark">
                {currencyFormat(order.total)}
              </p>

              {/* Badge estado */}
              <div className="hidden md:flex">
                {order.cancelledAt ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-red-500 bg-red-50 border border-red-200 px-3 py-1">
                    <IoCloseCircleOutline size={11} />
                    Cancelada
                  </span>
                ) : order.isPaid ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1">
                    <IoCheckmarkCircleOutline size={11} />
                    Pagada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-kyzz-muted bg-kyzz-tertiary border border-kyzz-secondary px-3 py-1">
                    <IoTimeOutline size={11} />
                    Pendiente
                  </span>
                )}
              </div>

              {/* Link detalle */}
              <Link
                href={`/orders/${order.id}`}
                className="text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
              >
                Ver →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
