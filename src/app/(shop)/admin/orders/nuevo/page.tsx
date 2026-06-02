import { titleFont } from '@/config/fonts';
import { getCountries } from '@/actions';
import { ManualOrderForm } from './ui/ManualOrderForm';

export default async function NuevoPedidoPage() {
  const countries = await getCountries();

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">
          Pedidos · Registro manual
        </p>
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Nuevo pedido WhatsApp
        </h1>
        <p className="text-sm text-kyzz-muted mt-2 max-w-prose">
          Registra una venta cerrada por WhatsApp u otro canal. Se reserva el stock y la orden
          queda trazable igual que una compra web.
        </p>
      </div>

      <ManualOrderForm countries={countries.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
