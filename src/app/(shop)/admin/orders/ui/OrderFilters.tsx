'use client';

import { useRouter, usePathname } from 'next/navigation';
import { IoFunnelOutline } from 'react-icons/io5';

interface Props {
  statusFilter:  string;
  channelFilter: string;
  paidFilter:    string;
  query:         string;
}

const STATUS_OPTIONS = [
  { value: 'all',        label: 'Todos' },
  { value: 'pending',    label: 'Pendiente' },
  { value: 'processing', label: 'Preparando' },
  { value: 'shipped',    label: 'Enviado' },
  { value: 'delivered',  label: 'Entregado' },
  { value: 'returned',   label: 'Devuelto' },
  { value: 'cancelled',  label: 'Cancelado' },
];

const CHANNEL_OPTIONS = [
  { value: 'all',       label: 'Todos los canales' },
  { value: 'web',       label: 'Web' },
  { value: 'manual',    label: 'Manuales' },   // WhatsApp + Instagram + Otro
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
];

const PAID_OPTIONS = [
  { value: 'all',    label: 'Cualquier pago' },
  { value: 'paid',   label: 'Pagadas' },
  { value: 'unpaid', label: 'Sin pagar' },
];

export function OrderFilters({ statusFilter, channelFilter, paidFilter, query }: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  const push = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (query)                   params.set('q',       query);
    if (key !== 'status'  && statusFilter  !== 'all') params.set('status',  statusFilter);
    if (key !== 'channel' && channelFilter !== 'all') params.set('channel', channelFilter);
    if (key !== 'paid'    && paidFilter    !== 'all') params.set('paid',    paidFilter);
    if (value !== 'all') params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasFilters = statusFilter !== 'all' || channelFilter !== 'all' || paidFilter !== 'all';

  const clearAll = () => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="mb-5 space-y-2">
      {/* Fila 1: Estado de envío */}
      <div className="flex flex-wrap items-center gap-1.5">
        <IoFunnelOutline size={11} className="text-kyzz-muted shrink-0" />
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => push('status', opt.value)}
            className={`text-[10px] tracking-widest uppercase px-2.5 py-1 border transition-all ${
              statusFilter === opt.value
                ? 'border-kyzz-dark bg-kyzz-dark text-white'
                : 'border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Fila 2: Canal + pago + limpiar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-[11px] shrink-0" />
        {CHANNEL_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => push('channel', opt.value)}
            className={`text-[10px] tracking-widest uppercase px-2.5 py-1 border transition-all ${
              channelFilter === opt.value
                ? 'border-kyzz-primary bg-kyzz-primary/10 text-kyzz-primary'
                : 'border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}

        <span className="w-px h-4 bg-kyzz-secondary mx-1 shrink-0" />

        {PAID_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => push('paid', opt.value)}
            className={`text-[10px] tracking-widest uppercase px-2.5 py-1 border transition-all ${
              paidFilter === opt.value
                ? 'border-kyzz-primary bg-kyzz-primary/10 text-kyzz-primary'
                : 'border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}

        {hasFilters && (
          <>
            <span className="w-px h-4 bg-kyzz-secondary mx-1 shrink-0" />
            <button
              onClick={clearAll}
              className="text-[10px] tracking-widest uppercase px-2.5 py-1 text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
            >
              Limpiar filtros
            </button>
          </>
        )}
      </div>
    </div>
  );
}
