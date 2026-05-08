import { auth } from "@/auth";
import { getOrdersByUser } from "@/actions";
import { titleFont } from "@/config/fonts";
import { redirect } from "next/navigation";
import Link from "next/link";
import { currencyFormat } from "@/utils";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/profile");
  }

  const { ok, orders = [] } = await getOrdersByUser();

  const { name, email, role } = session.user;

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">

      {/* Cabecera */}
      <div className="mb-10">
        <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-3">
          Mi cuenta
        </p>
        <h1 className={`${titleFont.className} text-4xl font-normal text-kyzz-dark`}>
          Perfil
        </h1>
        <div className="w-8 h-px bg-kyzz-secondary mt-4" />
      </div>

      {/* Datos del usuario */}
      <div className="kyzz-panel p-6 mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted mb-1">Nombre</p>
            <p className="text-sm text-kyzz-dark">{name}</p>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted mb-1">Correo</p>
            <p className="text-sm text-kyzz-dark">{email}</p>
          </div>
          {role === 'admin' && (
            <div className="sm:col-span-2">
              <p className="text-[11px] tracking-[0.18em] uppercase text-kyzz-muted mb-1">Rol</p>
              <span className="inline-block text-xs tracking-widest uppercase bg-kyzz-dark text-white px-3 py-1">
                Administrador
              </span>
            </div>
          )}
        </div>

        {role === 'admin' && (
          <div className="mt-6 pt-6 border-t border-kyzz-secondary">
            <Link
              href="/admin/products"
              className="text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
            >
              Ir al panel de administración →
            </Link>
          </div>
        )}
      </div>

      {/* Pedidos */}
      <div>
        <h2 className={`${titleFont.className} text-2xl font-normal text-kyzz-dark mb-6`}>
          Mis pedidos
        </h2>

        {!ok || orders.length === 0 ? (
          <div className="kyzz-panel p-10 text-center">
            <p className="text-sm text-kyzz-muted mb-4">Aún no tienes pedidos.</p>
            <Link href="/" className="btn-primary inline-block">
              Explorar colección
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-kyzz-secondary border border-kyzz-secondary">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-6 py-4 hover:bg-kyzz-secondary/20 transition-colors">
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs tracking-widest uppercase text-kyzz-muted">
                    #{order.id.split('-').at(-1)}
                  </p>
                  <p className="text-sm text-kyzz-dark">
                    {order.OrderAddress?.firstName} {order.OrderAddress?.lastName}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <span className={`text-xs tracking-widest uppercase ${order.isPaid ? 'text-green-700' : 'text-red-500'}`}>
                    {order.isPaid ? 'Pagada' : 'Pendiente'}
                  </span>
                  <Link
                    href={`/orders/${order.id}`}
                    className="text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
                  >
                    Ver →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}

