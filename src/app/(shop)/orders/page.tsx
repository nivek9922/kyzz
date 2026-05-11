export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { IoShirtOutline } from "react-icons/io5";

import { getOrdersByUser } from "@/actions";
import { titleFont } from "@/config/fonts";
import { OrderCard } from "./ui/OrderCard";

export default async function OrdersPage() {
  const { ok, orders = [] } = await getOrdersByUser();

  if (!ok) redirect("/auth/login?callbackUrl=/orders");

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">

      {/* ── Cabecera ──────────────────────────────────── */}
      <div className="mb-12">
        <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-3">
          Mi cuenta
        </p>
        <h1 className={`${titleFont.className} text-4xl font-normal text-kyzz-dark`}>
          Mis pedidos
        </h1>
        <div className="w-8 h-px bg-kyzz-secondary mt-4" />
      </div>

      {/* ── Lista de pedidos ──────────────────────────── */}
      {orders.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

    </main>
  );
}

// ── Empty state ───────────────────────────────────────────────
const EmptyState = () => (
  <div className="flex flex-col items-center text-center py-24 gap-6">
    <div className="w-16 h-16 border border-kyzz-secondary flex items-center justify-center">
      <IoShirtOutline className="w-7 h-7 text-kyzz-muted" />
    </div>
    <div>
      <p className={`${titleFont.className} text-2xl font-normal text-kyzz-dark mb-2`}>
        Aún no tienes pedidos
      </p>
      <p className="text-sm text-kyzz-muted">
        Cuando realices tu primera compra, aparecerá aquí.
      </p>
    </div>
    <Link href="/products" className="btn-primary mt-2">
      Explorar colección
    </Link>
  </div>
);

