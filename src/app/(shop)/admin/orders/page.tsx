export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { IoCheckmarkCircleOutline, IoTimeOutline, IoReceiptOutline } from "react-icons/io5";
import { getPaginatedOrders } from "@/actions";
import { titleFont } from "@/config/fonts";
import { currencyFormat } from "@/utils";

export default async function AdminOrdersPage() {
  const { ok, orders = [] } = await getPaginatedOrders();
  if (!ok) redirect("/auth/login");

  return (
    <div>
      {/* Cabecera */}
      <div className="mb-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Admin</p>
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Pedidos
        </h1>
        <div className="w-6 h-px bg-kyzz-secondary mt-3" />
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-4 text-center border border-kyzz-secondary">
          <IoReceiptOutline className="w-8 h-8 text-kyzz-muted" />
          <p className="text-sm text-kyzz-muted">Sin pedidos registrados</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-kyzz-secondary border border-kyzz-secondary">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[100px_1fr_120px_100px_80px] gap-4 px-5 py-3 bg-kyzz-tertiary">
            {['Pedido', 'Cliente', 'Total', 'Estado', ''].map((h, i) => (
              <p key={i} className="text-[10px] tracking-[0.2em] uppercase text-kyzz-muted">{h}</p>
            ))}
          </div>

          {orders.map((order) => (
            <div
              key={order.id}
              className="grid grid-cols-[1fr_auto] md:grid-cols-[100px_1fr_120px_100px_80px] gap-4 items-center px-5 py-4 hover:bg-kyzz-tertiary/50 transition-colors"
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

              {/* Badge */}
              <div className="hidden md:flex">
                {order.isPaid ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1">
                    <IoCheckmarkCircleOutline size={11} />
                    Pagado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-kyzz-muted bg-kyzz-tertiary border border-kyzz-secondary px-3 py-1">
                    <IoTimeOutline size={11} />
                    Pendiente
                  </span>
                )}
              </div>

              {/* Link */}
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
