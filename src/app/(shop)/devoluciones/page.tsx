export const revalidate = 0;

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { titleFont } from '@/config/fonts';
import { currencyFormat } from '@/utils';
import { getMyReturns } from '@/actions/return/get-customer-returns';
import type { ReturnStatus } from '@prisma/client';

const STATUS_LABEL: Partial<Record<ReturnStatus, string>> = {
  PENDING:               'En revisión',
  EVIDENCE_REQUIRED:     'Pendiente de evidencia',
  APPROVED:              'Aprobada',
  GUIDE_SENT:            'Guía de regreso enviada',
  IN_TRANSIT:            'En camino a KYZZ',
  RECEIVED:              'Recibida en bodega',
  INSPECTING:            'En inspección',
  ACCEPTED:              'Aceptada — procesando',
  PROCESSING:            'Procesando resolución',
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

// Estados que requieren acción del cliente
const NEEDS_ACTION: ReturnStatus[] = ['EVIDENCE_REQUIRED', 'APPROVED', 'GUIDE_SENT'];

const TYPE_LABEL: Record<string, string> = {
  RETURN: 'Devolución', SIZE_EXCHANGE: 'Cambio talla',
  PRODUCT_EXCHANGE: 'Cambio producto', DEFECTIVE: 'Defectuoso',
  WARRANTY: 'Garantía', KYZZ_ERROR: 'Error KYZZ',
};

export default async function MisDevolucionesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login?callbackUrl=/devoluciones');

  const returns = await getMyReturns();

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <div className="mb-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Mi cuenta</p>
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>Mis devoluciones</h1>
        <div className="w-6 h-px bg-kyzz-secondary mt-3" />
      </div>

      {returns.length === 0 ? (
        <div className="border border-kyzz-secondary py-20 text-center space-y-3">
          <p className="text-sm text-kyzz-muted">No tienes solicitudes de devolución.</p>
          <Link href="/orders" className="text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors">
            Ver mis pedidos →
          </Link>
        </div>
      ) : (
        <div className="border border-kyzz-secondary divide-y divide-kyzz-secondary">
          {returns.map((ret) => {
            const needsAction = NEEDS_ACTION.includes(ret.status);
            return (
              <div key={ret.id} className={`grid grid-cols-[1fr_auto] items-center px-5 py-4 gap-4 transition-colors ${
                needsAction ? 'bg-amber-50/40' : 'hover:bg-kyzz-tertiary/40'
              }`}>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[ret.status] ?? 'bg-kyzz-muted'}`} />
                    <span className="text-[11px] tracking-widest uppercase text-kyzz-muted">
                      {STATUS_LABEL[ret.status] ?? ret.status}
                    </span>
                    {ret.rmaCode && (
                      <span className="text-[10px] font-mono text-kyzz-dark">{ret.rmaCode}</span>
                    )}
                    {ret.requestType && (
                      <span className="text-[9px] tracking-widest uppercase px-1.5 py-0.5 border border-kyzz-secondary text-kyzz-muted">
                        {TYPE_LABEL[ret.requestType] ?? ret.requestType}
                      </span>
                    )}
                    {needsAction && (
                      <span className="text-[9px] tracking-widest uppercase px-1.5 py-0.5 border border-amber-300 text-amber-700 bg-amber-50">
                        Requiere acción
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-kyzz-dark truncate">{ret.reason}</p>
                  <p className="text-[10px] text-kyzz-muted">
                    Pedido #{ret.order.id.split('-').at(-1)?.toUpperCase()} · {currencyFormat(ret.order.total)} ·{' '}
                    {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(ret.createdAt)}
                  </p>
                </div>
                <Link href={`/devoluciones/${ret.id}`}
                  className="shrink-0 text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors">
                  Ver →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
