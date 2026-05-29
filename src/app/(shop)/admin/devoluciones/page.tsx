import Link from 'next/link';
import { titleFont } from '@/config/fonts';
import { currencyFormat } from '@/utils';
import { getReturnRequests } from '@/actions/return/update-return-status';
import { ReturnStatusManager } from './ui/ReturnStatusManager';
import type { ReturnStatus } from '@prisma/client';

const STATUS_LABEL: Record<ReturnStatus, string> = {
  PENDING:   'En revisión',
  APPROVED:  'Aprobada',
  REJECTED:  'Rechazada',
  COMPLETED: 'Completada',
};

const STATUS_DOT: Record<ReturnStatus, string> = {
  PENDING:   'bg-amber-400',
  APPROVED:  'bg-emerald-500',
  REJECTED:  'bg-red-400',
  COMPLETED: 'bg-kyzz-primary',
};

const CHANNEL_LABEL: Record<string, string> = {
  web:       'Web',
  whatsapp:  'WhatsApp',
  instagram: 'Instagram',
  other:     'Otro',
};

const CHANNEL_COLOR: Record<string, string> = {
  web:       'text-blue-700 bg-blue-50 border-blue-200',
  whatsapp:  'text-emerald-700 bg-emerald-50 border-emerald-200',
  instagram: 'text-purple-700 bg-purple-50 border-purple-200',
  other:     'text-kyzz-muted bg-kyzz-tertiary border-kyzz-secondary',
};

export default async function AdminDevolucionesPage() {
  const requests = await getReturnRequests();
  const pending  = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      <div className="mb-10">
        <p className="text-[11px] tracking-[0.3em] uppercase text-kyzz-muted mb-1">Admin · Gestión</p>
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>Devoluciones</h1>
        <div className="kyzz-divider-left" />
        {pending > 0 && (
          <p className="text-sm text-amber-600 mt-4">
            {pending} {pending === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de revisión
          </p>
        )}
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-kyzz-muted py-16 text-center">No hay solicitudes de devolución aún.</p>
      ) : (
        <div className="space-y-0 border border-kyzz-secondary divide-y divide-kyzz-secondary">
          {requests.map((req) => {
            const customerName  = req.order.user?.name ?? req.order.guestEmail ?? 'Invitado';
            const customerEmail = req.order.user?.email ?? req.order.guestEmail ?? '—';
            const shortOrder    = req.orderId.split('-').at(-1)?.toUpperCase();
            const channel       = req.order.channel as string;
            const isCod         = req.order.paymentMethod === 'cod';

            return (
              <div key={req.id} className="p-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                <div className="space-y-1.5">

                  {/* Cabecera: estado + orden + canal */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[req.status]}`} />
                    <span className="text-[11px] tracking-widest uppercase text-kyzz-muted">
                      {STATUS_LABEL[req.status]}
                    </span>
                    <span className="text-[11px] text-kyzz-muted">·</span>
                    <Link
                      href={`/admin/orders/${req.orderId}`}
                      className="text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-dark transition-colors"
                    >
                      Orden #{shortOrder}
                    </Link>
                    <span className={`text-[9px] tracking-widest uppercase px-2 py-0.5 border ${CHANNEL_COLOR[channel] ?? CHANNEL_COLOR.other}`}>
                      {CHANNEL_LABEL[channel] ?? channel}
                    </span>
                    {isCod && (
                      <span className="text-[9px] tracking-widest uppercase px-2 py-0.5 border text-orange-700 bg-orange-50 border-orange-200">
                        COD
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-kyzz-dark">{req.reason}</p>
                  {req.details && (
                    <p className="text-xs text-kyzz-muted leading-relaxed">{req.details}</p>
                  )}

                  {/* Info cliente + valor */}
                  <div className="flex items-center gap-3 pt-1 flex-wrap">
                    <p className="text-xs text-kyzz-muted">{customerName}</p>
                    <span className="text-xs text-kyzz-secondary">·</span>
                    <p className="text-xs text-kyzz-muted">{customerEmail}</p>
                    <span className="text-xs text-kyzz-secondary">·</span>
                    <p className="text-xs text-kyzz-muted">{currencyFormat(req.order.total)}</p>
                    <span className="text-xs text-kyzz-secondary">·</span>
                    <p className="text-xs text-kyzz-muted">
                      {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(req.createdAt)}
                    </p>
                  </div>

                  {/* Resolución acordada */}
                  {req.returnType && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] tracking-widest uppercase text-kyzz-muted">
                        {req.returnType === 'EXCHANGE' ? '↔ Cambio de producto' : '$ Reembolso'}
                      </span>
                      {req.returnType === 'REFUND' && req.refundAmount && (
                        <>
                          <span className="text-xs text-kyzz-secondary">·</span>
                          <span className="text-xs text-kyzz-dark font-medium">{currencyFormat(req.refundAmount)}</span>
                          {req.refundMethod && (
                            <>
                              <span className="text-xs text-kyzz-secondary">·</span>
                              <span className="text-xs text-kyzz-muted">{req.refundMethod}</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Mensajes e instrucciones */}
                  {req.customerMessage && (
                    <p className="text-xs text-kyzz-muted border-l-2 border-kyzz-secondary pl-3 italic mt-2">
                      <span className="not-italic text-[10px] tracking-widest uppercase">Instrucciones enviadas:</span>{' '}
                      {req.customerMessage}
                    </p>
                  )}
                  {req.adminNotes && (
                    <p className="text-xs text-kyzz-muted border-l-2 border-amber-200 pl-3 italic mt-1">
                      <span className="not-italic text-[10px] tracking-widest uppercase">Nota interna:</span>{' '}
                      {req.adminNotes}
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  <ReturnStatusManager
                    returnId={req.id}
                    currentStatus={req.status}
                    currentReturn={req.returnType}
                    adminNotes={req.adminNotes ?? ''}
                    customerMessage={req.customerMessage ?? ''}
                    orderTotal={req.order.total}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
