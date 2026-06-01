export const revalidate = 0;

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { titleFont } from '@/config/fonts';
import { ProductImage } from '@/components/product/product-image/ProductImage';
import { currencyFormat } from '@/utils';
import { getReturnRequestById } from '@/actions/return/get-return-request';
import { ReturnFlowManager } from './ui/ReturnFlowManager';
import { ReturnTimeline } from './ui/ReturnTimeline';
import type { ReturnStatus } from '@prisma/client';

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

const STATUS_COLOR: Partial<Record<ReturnStatus, string>> = {
  PENDING:               'text-amber-700 bg-amber-50 border-amber-200',
  EVIDENCE_REQUIRED:     'text-amber-700 bg-amber-50 border-amber-200',
  APPROVED:              'text-blue-700 bg-blue-50 border-blue-200',
  GUIDE_SENT:            'text-blue-700 bg-blue-50 border-blue-200',
  IN_TRANSIT:            'text-sky-700 bg-sky-50 border-sky-200',
  RECEIVED:              'text-sky-700 bg-sky-50 border-sky-200',
  INSPECTING:            'text-violet-700 bg-violet-50 border-violet-200',
  ACCEPTED:              'text-emerald-700 bg-emerald-50 border-emerald-200',
  PROCESSING:            'text-emerald-700 bg-emerald-50 border-emerald-200',
  COMPLETED:             'text-kyzz-primary bg-kyzz-tertiary border-kyzz-secondary',
  REJECTED:              'text-red-700 bg-red-50 border-red-200',
  REJECTED_AFTER_INSPECT:'text-red-700 bg-red-50 border-red-200',
  CLOSED:                'text-kyzz-muted bg-kyzz-tertiary border-kyzz-secondary',
};

const TYPE_LABEL: Record<string, string> = {
  RETURN: 'Devolución', SIZE_EXCHANGE: 'Cambio de talla',
  PRODUCT_EXCHANGE: 'Cambio de producto', DEFECTIVE: 'Producto defectuoso',
  WARRANTY: 'Garantía', KYZZ_ERROR: 'Error de KYZZ',
};

interface Props { params: Promise<{ id: string }> }

export default async function ReturnDetailPage({ params }: Props) {
  const { id } = await params;
  const ret    = await getReturnRequestById(id);
  if (!ret) notFound();

  const order    = ret.order;
  const customer = order.user?.name ?? order.guestEmail ?? 'Invitado';
  const email    = order.user?.email ?? order.guestEmail ?? '—';
  const shortOrder  = order.id.split('-').at(-1)?.toUpperCase();
  const shortRMA    = ret.rmaCode ?? '—';
  const expiresAt   = ret.expiresAt;
  const daysLeft    = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000) : null;

  return (
    <div>
      {/* Cabecera */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin/devoluciones" className="text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors">
              ← Devoluciones
            </Link>
          </div>
          <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
            {shortRMA}
          </h1>
          <div className="w-6 h-px bg-kyzz-secondary mt-3" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {ret.requestType && (
            <span className="text-[9px] tracking-widest uppercase px-2 py-1 border border-kyzz-secondary text-kyzz-muted">
              {TYPE_LABEL[ret.requestType] ?? ret.requestType}
            </span>
          )}
          <span className={`text-[10px] tracking-widest uppercase px-3 py-1 border ${STATUS_COLOR[ret.status] ?? 'text-kyzz-muted border-kyzz-secondary'}`}>
            {STATUS_LABEL[ret.status] ?? ret.status}
          </span>
          {daysLeft !== null && daysLeft > 0 && (
            <span className={`text-[10px] tracking-widest uppercase px-2 py-1 border ${daysLeft <= 3 ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-kyzz-muted border-kyzz-secondary'}`}>
              Vence en {daysLeft}d
            </span>
          )}
          {daysLeft !== null && daysLeft <= 0 && (
            <span className="text-[10px] tracking-widest uppercase px-2 py-1 border text-red-600 bg-red-50 border-red-200">
              Plazo vencido
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* ── Panel izquierdo ────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Cliente y pedido */}
          <div className="kyzz-panel p-5 space-y-3">
            <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted">Cliente y pedido</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-0.5">Cliente</p>
                <p className="text-kyzz-dark">{customer}</p>
                <p className="text-[11px] text-kyzz-muted">{email}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-0.5">Pedido</p>
                <Link href={`/admin/orders/${order.id}`} className="text-kyzz-dark hover:text-kyzz-primary transition-colors text-[11px] font-mono">
                  #{shortOrder}
                </Link>
                <p className="text-[11px] text-kyzz-muted">{currencyFormat(order.total)}</p>
              </div>
              {order.OrderAddress && (
                <div className="col-span-2">
                  <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-0.5">Dirección</p>
                  <p className="text-[11px] text-kyzz-muted">
                    {order.OrderAddress.address}, {order.OrderAddress.city}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Productos del pedido original */}
          <div className="kyzz-panel p-5 space-y-3">
            <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted">Productos del pedido</p>
            <div className="space-y-3">
              {order.OrderItem.map((item) => {
                const imgUrl =
                  item.variant?.color?.images?.[0]?.url
                  ?? item.product.ProductImage[0]?.url
                  ?? item.product.ProductColors?.[0]?.images?.[0]?.url;
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-kyzz-tertiary border border-kyzz-secondary shrink-0 overflow-hidden">
                      <ProductImage src={imgUrl} alt={item.product.title} width={48} height={48} className="object-cover w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-kyzz-dark truncate">{item.product.title}</p>
                      <p className="text-[10px] text-kyzz-muted">
                        Talla {item.size} · {item.quantity} und. · {currencyFormat(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Solicitud del cliente */}
          <div className="kyzz-panel p-5 space-y-3">
            <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted">Solicitud</p>
            <p className="text-sm text-kyzz-dark leading-relaxed">{ret.reason}</p>
            {ret.details && (
              <p className="text-xs text-kyzz-muted leading-relaxed border-l-2 border-kyzz-secondary pl-3">
                {ret.details}
              </p>
            )}
            {ret.proofImageUrl && (
              <div>
                <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-2">Evidencia fotográfica</p>
                <a href={ret.proofImageUrl} target="_blank" rel="noopener noreferrer">
                  <Image
                    src={ret.proofImageUrl} alt="Evidencia"
                    width={200} height={200}
                    className="object-cover border border-kyzz-secondary hover:opacity-80 transition-opacity"
                  />
                </a>
              </div>
            )}
          </div>

          {/* Info logística (si aplica) */}
          {(ret.returnTrackingCode || ret.whoPayShipping || ret.receivedAt || ret.itemCondition) && (
            <div className="kyzz-panel p-5 space-y-3">
              <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted">Logística inversa</p>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                {ret.whoPayShipping && (
                  <div>
                    <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-0.5">Paga el flete</p>
                    <p className="text-kyzz-dark">{ret.whoPayShipping === 'KYZZ' ? 'KYZZ' : 'Clienta'}</p>
                  </div>
                )}
                {ret.returnTrackingCode && (
                  <div>
                    <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-0.5">Guía de regreso</p>
                    <p className="text-kyzz-dark font-mono">{ret.returnTrackingCode}</p>
                    {ret.returnCarrier && <p className="text-kyzz-muted">{ret.returnCarrier}</p>}
                  </div>
                )}
                {ret.receivedAt && (
                  <div>
                    <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mb-0.5">Recibido en bodega</p>
                    <p className="text-kyzz-dark">{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(ret.receivedAt)}</p>
                  </div>
                )}
                {ret.itemCondition && (
                  <div>
                    <p className="text-[10px] tracking-widests uppercase text-kyzz-muted mb-0.5">Condición inspeccionada</p>
                    <p className="text-kyzz-dark">{ret.itemCondition}</p>
                    {ret.conditionNotes && <p className="text-kyzz-muted text-[11px]">{ret.conditionNotes}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          {ret.events.length > 0 && (
            <ReturnTimeline events={ret.events} />
          )}
        </div>

        {/* ── Panel derecho — Gestión ─────────────────────────────────── */}
        <div className="lg:sticky lg:top-6">
          <ReturnFlowManager
            returnId={ret.id}
            status={ret.status}
            requestType={ret.requestType}
            returnType={ret.returnType}
            whoPayShipping={ret.whoPayShipping}
            expiresAt={ret.expiresAt}
            adminNotes={ret.adminNotes ?? ''}
            customerMessage={ret.customerMessage ?? ''}
            orderTotal={order.total}
            refundAmount={ret.refundAmount}
            refundMethod={ret.refundMethod ?? ''}
            refundStatus={ret.refundStatus}
            itemCondition={ret.itemCondition}
          />
        </div>
      </div>
    </div>
  );
}
