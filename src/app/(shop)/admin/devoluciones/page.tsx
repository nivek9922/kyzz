export const revalidate = 0;

import Link from 'next/link';
import { titleFont } from '@/config/fonts';
import { currencyFormat } from '@/utils';
import { getReturnRequestsList } from '@/actions/return/get-return-request';
import type { ReturnStatus } from '@prisma/client';
import { ReturnListFilters } from './ui/ReturnListFilters';

const STATUS_LABEL: Partial<Record<ReturnStatus, string>> = {
  PENDING:               'En revisión',
  EVIDENCE_REQUIRED:     'Pendiente evidencia',
  APPROVED:              'Aprobada',
  GUIDE_SENT:            'Guía enviada',
  IN_TRANSIT:            'En tránsito',
  RECEIVED:              'Recibida en bodega',
  INSPECTING:            'En inspección',
  ACCEPTED:              'Aceptada',
  PROCESSING:            'Procesando',
  COMPLETED:             'Completada',
  REJECTED:              'Rechazada',
  REJECTED_AFTER_INSPECT:'Rechazada (inspección)',
  CLOSED:                'Cerrada',
};

const STATUS_DOT: Partial<Record<ReturnStatus, string>> = {
  PENDING:               'bg-amber-400',
  EVIDENCE_REQUIRED:     'bg-amber-400',
  APPROVED:              'bg-blue-400',
  GUIDE_SENT:            'bg-blue-400',
  IN_TRANSIT:            'bg-sky-500',
  RECEIVED:              'bg-sky-500',
  INSPECTING:            'bg-violet-400',
  ACCEPTED:              'bg-emerald-400',
  PROCESSING:            'bg-emerald-500',
  COMPLETED:             'bg-kyzz-primary',
  REJECTED:              'bg-red-400',
  REJECTED_AFTER_INSPECT:'bg-red-400',
  CLOSED:                'bg-kyzz-muted',
};

const TYPE_LABEL: Record<string, string> = {
  RETURN:           'Devolución',
  SIZE_EXCHANGE:    'Cambio talla',
  PRODUCT_EXCHANGE: 'Cambio producto',
  DEFECTIVE:        'Defectuoso',
  WARRANTY:         'Garantía',
  KYZZ_ERROR:       'Error KYZZ',
};

const TYPE_COLOR: Record<string, string> = {
  RETURN:           'text-kyzz-muted bg-kyzz-tertiary border-kyzz-secondary',
  SIZE_EXCHANGE:    'text-blue-700 bg-blue-50 border-blue-200',
  PRODUCT_EXCHANGE: 'text-blue-700 bg-blue-50 border-blue-200',
  DEFECTIVE:        'text-red-700 bg-red-50 border-red-200',
  WARRANTY:         'text-amber-700 bg-amber-50 border-amber-200',
  KYZZ_ERROR:       'text-red-700 bg-red-50 border-red-200',
};

const CHANNEL_LABEL: Record<string, string> = {
  web: 'Web', whatsapp: 'WhatsApp', instagram: 'Instagram', other: 'Otro',
};

/** Días transcurridos desde la creación (para urgencia visual). */
function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/** Días restantes hasta vencimiento del plazo. */
function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

interface Props {
  searchParams: Promise<{ status?: string; type?: string; channel?: string; urgency?: string }>;
}

export default async function AdminDevolucionesPage({ searchParams }: Props) {
  const params   = await searchParams;
  const requests = await getReturnRequestsList({
    status:  params.status,
    type:    params.type,
    channel: params.channel,
    urgency: params.urgency,
  });

  const pending  = requests.filter((r) => r.status === 'PENDING').length;
  const hasFilters = !!(params.status || params.type || params.channel || params.urgency);

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Admin</p>
          <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>Devoluciones</h1>
          <div className="w-6 h-px bg-kyzz-secondary mt-3" />
        </div>
        <div className="flex items-center gap-4">
          {pending > 0 && (
            <p className="text-sm text-amber-600">
              {pending} {pending === 1 ? 'pendiente' : 'pendientes'} de revisión
            </p>
          )}
          <Link href="/admin/devoluciones/analytics"
            className="text-[10px] tracking-widests uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors">
            Analytics →
          </Link>
        </div>
      </div>

      <ReturnListFilters
        statusFilter={params.status ?? 'all'}
        typeFilter={params.type ?? 'all'}
        urgencyFilter={params.urgency ?? 'all'}
      />

      {requests.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-3 border border-kyzz-secondary text-center">
          <p className="text-sm text-kyzz-muted">
            {hasFilters ? 'Sin resultados para los filtros aplicados.' : 'No hay solicitudes registradas aún.'}
          </p>
        </div>
      ) : (
        <div className="border border-kyzz-secondary divide-y divide-kyzz-secondary">
          {requests.map((req) => {
            const customer    = req.order.user?.name ?? req.order.guestEmail ?? 'Invitado';
            const days        = daysSince(req.createdAt);
            const isUrgent    = req.status === 'PENDING' && days >= 2;
            const expDays     = req.expiresAt ? daysUntil(req.expiresAt) : null;
            const isExpiring  = expDays !== null && expDays <= 3 && expDays > 0;
            const isExpired   = expDays !== null && expDays <= 0;

            return (
              <div
                key={req.id}
                className={`grid grid-cols-[1fr_auto] items-center px-5 py-4 gap-4 transition-colors ${
                  isUrgent ? 'bg-amber-50/50' : 'hover:bg-kyzz-tertiary/50'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  {/* Fila 1: estado + RMA + badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[req.status] ?? 'bg-kyzz-muted'}`} />
                    <span className="text-[10px] tracking-widest uppercase text-kyzz-muted">
                      {STATUS_LABEL[req.status] ?? req.status}
                    </span>
                    {req.rmaCode && (
                      <span className="text-[10px] font-mono text-kyzz-dark tracking-widest">
                        {req.rmaCode}
                      </span>
                    )}
                    {req.requestType && (
                      <span className={`text-[9px] tracking-widest uppercase px-1.5 py-0.5 border ${TYPE_COLOR[req.requestType] ?? TYPE_COLOR.RETURN}`}>
                        {TYPE_LABEL[req.requestType] ?? req.requestType}
                      </span>
                    )}
                    <span className={`text-[9px] tracking-widest uppercase px-1.5 py-0.5 border ${
                      req.order.channel === 'whatsapp' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                      req.order.channel === 'instagram' ? 'text-purple-700 bg-purple-50 border-purple-200' :
                      'text-kyzz-muted bg-kyzz-tertiary border-kyzz-secondary'
                    }`}>
                      {CHANNEL_LABEL[req.order.channel] ?? req.order.channel}
                    </span>
                  </div>

                  {/* Fila 2: cliente + importe + fecha + urgencia */}
                  <div className="flex items-center gap-2 flex-wrap text-[10px] text-kyzz-muted">
                    <span>{customer}</span>
                    <span>·</span>
                    <span>{currencyFormat(req.order.total)}</span>
                    <span>·</span>
                    <span>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(req.createdAt)}</span>
                    {isUrgent && (
                      <span className="text-amber-600 font-medium">· {days}d sin atender</span>
                    )}
                    {isExpiring && (
                      <span className="text-orange-600 font-medium">· Vence en {expDays}d</span>
                    )}
                    {isExpired && (
                      <span className="text-red-500 font-medium">· Plazo vencido</span>
                    )}
                  </div>

                  {/* Fila 3: razón resumida */}
                  <p className="text-xs text-kyzz-dark truncate">{req.reason}</p>
                </div>

                <Link
                  href={`/admin/devoluciones/${req.id}`}
                  className="shrink-0 text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors"
                >
                  Gestionar →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
