import Link from "next/link";
import Image from "next/image";
import { IoCheckmarkCircleOutline, IoTimeOutline, IoArrowForwardOutline } from "react-icons/io5";
import { titleFont } from "@/config/fonts";
import { currencyFormat } from "@/utils";

interface OrderItem {
  quantity: number;
  product: {
    title: string;
    ProductImage:  { url: string }[];
    ProductColors: { images: { url: string }[] }[];
  };
  variant: {
    colorId: string | null;
    color: { images: { url: string }[] } | null;
  } | null;
}

interface Props {
  order: {
    id: string;
    isPaid: boolean;
    total: number;
    createdAt: Date;
    itemsInOrder: number;
    OrderAddress: { firstName: string; lastName: string } | null;
    OrderItem: OrderItem[];
  };
}

export const OrderCard = ({ order }: Props) => {
  const shortId = order.id.split("-").at(-1)!.toUpperCase();
  const date = new Date(order.createdAt).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Bogota",
  });

  // Hasta 3 imágenes de vista previa
  const previews = order.OrderItem.slice(0, 3).map((item) => ({
    url: item.variant?.color?.images[0]?.url       // color exacto del pedido
      ?? item.product.ProductImage[0]?.url          // imagen legacy
      ?? item.product.ProductColors[0]?.images[0]?.url  // primer color de fallback
      ?? "/imgs/placeholder.jpg",
    title: item.product.title,
    qty: item.quantity,
  }));

  return (
    <Link
      href={`/orders/${order.id}`}
      className="group block border border-kyzz-secondary hover:border-kyzz-primary bg-kyzz-neutral transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row">

        {/* ── Imágenes de productos ───────────────────────── */}
        <div className="flex sm:w-48 shrink-0 overflow-hidden bg-kyzz-tertiary">
          {previews.length > 0 ? (
            <div className="flex w-full">
              {previews.map((p, i) => (
                <div
                  key={i}
                  className="relative flex-1 aspect-square overflow-hidden"
                  style={{ maxWidth: `${100 / previews.length}%` }}
                >
                  <Image
                    src={p.url.startsWith("http") ? p.url : `/products/${p.url}`}
                    alt={p.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 33vw, 64px"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full aspect-square sm:aspect-auto flex items-center justify-center">
              <span className="text-[10px] tracking-widest uppercase text-kyzz-muted">Sin imagen</span>
            </div>
          )}
        </div>

        {/* ── Información del pedido ─────────────────────── */}
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between px-6 py-5 gap-4">

          {/* Columna principal */}
          <div className="flex flex-col gap-1.5">
            {/* ID */}
            <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted">
              Pedido #{shortId}
            </p>

            {/* Nombre cliente */}
            {order.OrderAddress && (
              <p className={`${titleFont.className} text-base text-kyzz-dark font-normal`}>
                {order.OrderAddress.firstName} {order.OrderAddress.lastName}
              </p>
            )}

            {/* Fecha + artículos */}
            <p className="text-xs text-kyzz-muted">
              {date} · {order.itemsInOrder} {order.itemsInOrder === 1 ? "artículo" : "artículos"}
            </p>
          </div>

          {/* Columna derecha */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
            {/* Total */}
            <p className={`${titleFont.className} text-lg text-kyzz-dark`}>
              {currencyFormat(order.total)}
            </p>

            {/* Badge estado */}
            <StatusBadge isPaid={order.isPaid} />
          </div>

          {/* Flecha */}
          <IoArrowForwardOutline
            className="hidden sm:block text-kyzz-muted group-hover:text-kyzz-primary group-hover:translate-x-1 transition-all duration-200 shrink-0"
            size={18}
          />
        </div>
      </div>
    </Link>
  );
};

const StatusBadge = ({ isPaid }: { isPaid: boolean }) => {
  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1">
        <IoCheckmarkCircleOutline size={12} />
        Pagado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-kyzz-muted bg-kyzz-tertiary border border-kyzz-secondary px-3 py-1">
      <IoTimeOutline size={12} />
      Pendiente
    </span>
  );
};
