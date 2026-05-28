'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { toast } from 'sonner';
import { IoCloseOutline, IoSearchOutline } from 'react-icons/io5';
import {
  searchProductsQuick,
  getOrderableVariants,
  createManualOrder,
  type QuickSearchResult,
  type OrderableVariant,
} from '@/actions';
import { currencyFormat } from '@/utils';

// "web" excluido: los pedidos manuales siempre se cierran en un canal externo.
// El checkout web crea sus propias órdenes con channel='web' automáticamente.
type Channel = 'whatsapp' | 'instagram' | 'other';
type Method  = 'prepaid' | 'cod';

interface Line {
  variantId: string;
  title:     string;
  label:     string;   // talla · color
  price:     number;
  quantity:  number;
  available: number;
}

interface Props {
  countries: { id: string; name: string }[];
}

const emptyAddress = {
  firstName: '', lastName: '', address: '', address2: '',
  postalCode: '', city: '', country: '', phone: '',
};

export const ManualOrderForm = ({ countries }: Props) => {
  const router = useRouter();

  // ── Búsqueda de productos ──
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<QuickSearchResult[]>([]);
  const [picker, setPicker]   = useState<{ title: string; variants: OrderableVariant[] } | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setResults(await searchProductsQuick(query));
    }, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  const openPicker = async (p: QuickSearchResult) => {
    const variants = await getOrderableVariants(p.id);
    setResults([]);
    setQuery('');
    setPicker({ title: p.title, variants });
  };

  // ── Líneas del pedido ──
  const [lines, setLines] = useState<Line[]>([]);

  const addLine = (v: OrderableVariant, title: string) => {
    const label = `${v.size}${v.colorName ? ` · ${v.colorName}` : ''}`;
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === v.id);
      if (existing) {
        return prev.map((l) =>
          l.variantId === v.id ? { ...l, quantity: Math.min(l.quantity + 1, v.available) } : l,
        );
      }
      return [...prev, { variantId: v.id, title, label, price: v.price, quantity: 1, available: v.available }];
    });
    setPicker(null);
  };

  const setQty = (variantId: string, qty: number) =>
    setLines((prev) => prev.map((l) =>
      l.variantId === variantId ? { ...l, quantity: Math.max(1, Math.min(qty, l.available)) } : l));

  const removeLine = (variantId: string) =>
    setLines((prev) => prev.filter((l) => l.variantId !== variantId));

  const subTotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  // ── Datos del pedido ──
  const [address, setAddress] = useState({ ...emptyAddress, country: countries[0]?.id ?? '' });
  const [email, setEmail]         = useState('');
  const [channel, setChannel]     = useState<Channel>('whatsapp');
  const [method, setMethod]       = useState<Method>('cod');
  const [markPaid, setMarkPaid]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const setAddr = (k: keyof typeof emptyAddress, v: string) =>
    setAddress((prev) => ({ ...prev, [k]: v }));

  const onSubmit = async () => {
    if (lines.length === 0) { toast.error('Agrega al menos un producto.'); return; }
    if (!address.firstName || !address.address || !address.city || !address.country || !address.phone) {
      toast.error('Completa los datos de entrega', { description: 'Nombre, dirección, ciudad, país y teléfono son obligatorios.' });
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Creando pedido...');
    const resp = await createManualOrder({
      channel,
      paymentMethod: method,
      markPaid,
      email: email.trim() || undefined,
      address,
      items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    });

    if (!resp.ok) {
      toast.error('No se pudo crear el pedido', { id: toastId, description: resp.message });
      setSubmitting(false);
      return;
    }
    toast.success('Pedido creado', { id: toastId });
    router.push(`/admin/orders/${resp.orderId}`);
  };

  const inputCls = 'w-full border border-kyzz-secondary px-3 py-2 text-sm focus:outline-none focus:border-kyzz-dark bg-white';

  return (
    <div className="space-y-8">

      {/* ── Productos ── */}
      <section className="kyzz-panel p-6">
        <p className="text-[11px] tracking-[0.25em] uppercase text-kyzz-muted mb-4">Productos</p>

        <div className="relative">
          <div className="flex items-center gap-2 border border-kyzz-secondary px-3 py-2 bg-white">
            <IoSearchOutline className="text-kyzz-muted shrink-0" size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto por nombre…"
              className="w-full text-sm focus:outline-none"
            />
          </div>
          {results.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full bg-white border border-kyzz-secondary shadow-lg max-h-72 overflow-auto">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => openPicker(p)}
                    className="w-full text-left px-3 py-2 hover:bg-kyzz-tertiary flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-kyzz-dark truncate">{p.title}</span>
                    <span className="text-xs text-kyzz-muted shrink-0">{currencyFormat(p.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Selector de variante del producto elegido */}
        {picker && (
          <div className="mt-4 border border-kyzz-secondary p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-kyzz-dark font-medium">{picker.title}</p>
              <button type="button" onClick={() => setPicker(null)} className="text-kyzz-muted hover:text-kyzz-dark">
                <IoCloseOutline size={20} />
              </button>
            </div>
            {picker.variants.length === 0 ? (
              <p className="text-xs text-kyzz-muted">Este producto no tiene variantes.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {picker.variants.map((v) => {
                  const sold = v.available <= 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={sold}
                      onClick={() => addLine(v, picker.title)}
                      className={clsx(
                        'border px-3 py-2 text-left transition-colors',
                        sold
                          ? 'border-kyzz-secondary opacity-40 cursor-not-allowed'
                          : 'border-kyzz-secondary hover:border-kyzz-dark',
                      )}
                    >
                      <span className="block text-sm text-kyzz-dark">
                        {v.size}{v.colorName ? ` · ${v.colorName}` : ''}
                      </span>
                      <span className={clsx('block text-[11px]', sold ? 'text-red-500' : 'text-kyzz-muted')}>
                        {sold ? 'Agotado' : `${v.available} disp.`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Líneas agregadas */}
        {lines.length > 0 && (
          <div className="mt-5 divide-y divide-kyzz-secondary border-t border-kyzz-secondary">
            {lines.map((l) => (
              <div key={l.variantId} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-kyzz-dark truncate">{l.title}</p>
                  <p className="text-[11px] tracking-wide uppercase text-kyzz-muted">{l.label}</p>
                </div>
                <input
                  type="number"
                  min={1}
                  max={l.available}
                  value={l.quantity}
                  onChange={(e) => setQty(l.variantId, Number(e.target.value))}
                  className="w-16 border border-kyzz-secondary px-2 py-1 text-sm text-center"
                />
                <span className="text-sm text-kyzz-dark w-24 text-right">
                  {currencyFormat(l.price * l.quantity)}
                </span>
                <button type="button" onClick={() => removeLine(l.variantId)} className="text-kyzz-muted hover:text-red-500">
                  <IoCloseOutline size={18} />
                </button>
              </div>
            ))}
            <div className="flex justify-between py-3 text-sm">
              <span className="text-kyzz-muted">Subtotal</span>
              <span className="text-kyzz-dark font-medium">{currencyFormat(subTotal)}</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Cliente / Entrega ── */}
      <section className="kyzz-panel p-6 space-y-4">
        <p className="text-[11px] tracking-[0.25em] uppercase text-kyzz-muted">Cliente y entrega</p>

        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Nombre *"   value={address.firstName} onChange={(e) => setAddr('firstName', e.target.value)} />
          <input className={inputCls} placeholder="Apellido"   value={address.lastName}  onChange={(e) => setAddr('lastName', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Teléfono (WhatsApp) *" value={address.phone} onChange={(e) => setAddr('phone', e.target.value)} />
          <input className={inputCls} placeholder="Email (opcional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <input className={inputCls} placeholder="Dirección *" value={address.address} onChange={(e) => setAddr('address', e.target.value)} />
        <input className={inputCls} placeholder="Apto / referencia" value={address.address2} onChange={(e) => setAddr('address2', e.target.value)} />
        <div className="grid grid-cols-3 gap-3">
          <input className={inputCls} placeholder="Ciudad *" value={address.city} onChange={(e) => setAddr('city', e.target.value)} />
          <input className={inputCls} placeholder="Código postal" value={address.postalCode} onChange={(e) => setAddr('postalCode', e.target.value)} />
          <select className={inputCls} value={address.country} onChange={(e) => setAddr('country', e.target.value)}>
            <option value="">País *</option>
            {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </section>

      {/* ── Canal y pago ── */}
      <section className="kyzz-panel p-6 space-y-4">
        <p className="text-[11px] tracking-[0.25em] uppercase text-kyzz-muted">Canal y pago</p>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[11px] text-kyzz-muted mb-1">
              Canal de cierre
              <span className="ml-1 text-kyzz-muted/60 normal-case tracking-normal font-normal"> — dónde se cerró la venta</span>
            </span>
            <select className={inputCls} value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram / TikTok</option>
              <option value="other">Otro (llamada, presencial…)</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-[11px] text-kyzz-muted mb-1">Método de pago</span>
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as Method)}>
              <option value="cod">Contraentrega</option>
              <option value="prepaid">Prepago</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-kyzz-dark cursor-pointer">
          <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} />
          Pago ya recibido (transferencia / efectivo) — marcar como pagado
        </label>
      </section>

      <button
        onClick={onSubmit}
        disabled={submitting}
        className={clsx('w-full md:w-auto', submitting ? 'btn-disabled' : 'btn-primary')}
      >
        {submitting ? 'Creando…' : 'Crear pedido'}
      </button>
    </div>
  );
};
