'use client';

import { useRouter, usePathname } from 'next/navigation';
import { IoFunnelOutline } from 'react-icons/io5';

interface Props {
  statusFilter:  string;
  typeFilter:    string;
  urgencyFilter: string;
}

const STATUS_OPTS = [
  { value: 'all',                   label: 'Todos' },
  { value: 'PENDING',               label: 'Pendiente' },
  { value: 'EVIDENCE_REQUIRED',     label: 'Evidencia' },
  { value: 'APPROVED',              label: 'Aprobada' },
  { value: 'GUIDE_SENT',            label: 'Guía enviada' },
  { value: 'IN_TRANSIT',            label: 'En tránsito' },
  { value: 'RECEIVED',              label: 'Recibida' },
  { value: 'INSPECTING',            label: 'Inspección' },
  { value: 'ACCEPTED',              label: 'Aceptada' },
  { value: 'PROCESSING',            label: 'Procesando' },
  { value: 'COMPLETED',             label: 'Completada' },
  { value: 'REJECTED',              label: 'Rechazada' },
  { value: 'CLOSED',                label: 'Cerrada' },
];

const TYPE_OPTS = [
  { value: 'all',             label: 'Todos los tipos' },
  { value: 'RETURN',          label: 'Devolución' },
  { value: 'SIZE_EXCHANGE',   label: 'Cambio talla' },
  { value: 'PRODUCT_EXCHANGE',label: 'Cambio producto' },
  { value: 'DEFECTIVE',       label: 'Defectuoso' },
  { value: 'WARRANTY',        label: 'Garantía' },
  { value: 'KYZZ_ERROR',      label: 'Error KYZZ' },
];

const URGENCY_OPTS = [
  { value: 'all',      label: 'Cualquier urgencia' },
  { value: 'urgent',   label: 'Sin atender +48h' },
  { value: 'expiring', label: 'Plazo próx. a vencer' },
];

export function ReturnListFilters({ statusFilter, typeFilter, urgencyFilter }: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  const push = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (key !== 'status'  && statusFilter  !== 'all') params.set('status',  statusFilter);
    if (key !== 'type'    && typeFilter    !== 'all') params.set('type',    typeFilter);
    if (key !== 'urgency' && urgencyFilter !== 'all') params.set('urgency', urgencyFilter);
    if (value !== 'all') params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasFilters = statusFilter !== 'all' || typeFilter !== 'all' || urgencyFilter !== 'all';

  return (
    <div className="mb-5 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <IoFunnelOutline size={11} className="text-kyzz-muted shrink-0" />
        {STATUS_OPTS.map(opt => (
          <button key={opt.value} onClick={() => push('status', opt.value)}
            className={`text-[10px] tracking-widest uppercase px-2.5 py-1 border transition-all ${
              statusFilter === opt.value
                ? 'border-kyzz-dark bg-kyzz-dark text-white'
                : 'border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-[11px] shrink-0" />
        {TYPE_OPTS.map(opt => (
          <button key={opt.value} onClick={() => push('type', opt.value)}
            className={`text-[10px] tracking-widest uppercase px-2.5 py-1 border transition-all ${
              typeFilter === opt.value
                ? 'border-kyzz-primary bg-kyzz-primary/10 text-kyzz-primary'
                : 'border-kyzz-secondary text-kyzz-muted hover:border-kyzz-primary hover:text-kyzz-primary'
            }`}>
            {opt.label}
          </button>
        ))}
        <span className="w-px h-4 bg-kyzz-secondary mx-1 shrink-0" />
        {URGENCY_OPTS.map(opt => (
          <button key={opt.value} onClick={() => push('urgency', opt.value)}
            className={`text-[10px] tracking-widest uppercase px-2.5 py-1 border transition-all ${
              urgencyFilter === opt.value
                ? 'border-amber-500 bg-amber-50 text-amber-700'
                : 'border-kyzz-secondary text-kyzz-muted hover:border-amber-400 hover:text-amber-600'
            }`}>
            {opt.label}
          </button>
        ))}
        {hasFilters && (
          <>
            <span className="w-px h-4 bg-kyzz-secondary mx-1 shrink-0" />
            <button onClick={() => router.push(pathname)}
              className="text-[10px] tracking-widest uppercase px-2.5 py-1 text-red-500 border border-red-200 hover:bg-red-50 transition-colors">
              Limpiar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
