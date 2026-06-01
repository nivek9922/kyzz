export const revalidate = 0;

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { whatsappUrl } from '@/lib/whatsapp';
import { auth } from '@/auth';
import { titleFont } from '@/config/fonts';
import { currencyFormat } from '@/utils';
import { getMyReturnById } from '@/actions/return/get-customer-returns';
import { ProductImage } from '@/components/product/product-image/ProductImage';
import { CustomerReturnActions } from './ui/CustomerReturnActions';
import type { ReturnStatus } from '@prisma/client';

// Mensaje contextual por estado (voz de KYZZ hacia la clienta)
const STATUS_MESSAGE: Partial<Record<ReturnStatus, string>> = {
  PENDING:
    'Recibimos tu solicitud. La estamos revisando y nos pondremos en contacto contigo en 1–3 días hábiles.',
  EVIDENCE_REQUIRED:
    'Necesitamos algunas fotos del producto para continuar con tu solicitud. Por favor súbelas aquí abajo.',
  APPROVED:
    'Tu solicitud fue aprobada. Lee las instrucciones a continuación para enviar el producto de regreso.',
  GUIDE_SENT:
    'Te enviamos la guía de devolución por email. Úsala para enviar el producto de regreso. Cuando lo hayas enviado, confirma aquí abajo.',
  IN_TRANSIT:
    'Tu paquete está en camino a nuestra bodega. Te notificaremos cuando lo recibamos.',
  RECEIVED:
    'Recibimos tu paquete en nuestra bodega. Estamos iniciando la inspección del producto.',
  INSPECTING:
    'Estamos inspeccionando el producto. Esto toma entre 2 y 5 días hábiles. Te contactaremos pronto.',
  ACCEPTED:
    'La inspección fue exitosa. Estamos procesando la resolución de tu solicitud.',
  PROCESSING:
    'Tu solicitud está siendo procesada. Recibirás un mensaje cuando esté lista.',
  COMPLETED:
    'Tu solicitud fue completada exitosamente. ¡Gracias por tu paciencia!',
  REJECTED:
    'Lamentablemente no pudimos procesar tu solicitud. Si tienes preguntas, escríbenos por WhatsApp.',
  REJECTED_AFTER_INSPECT:
    'Después de inspeccionar el producto, no fue posible procesar el cambio. Nos pondremos en contacto para coordinar los siguientes pasos.',
  CLOSED:
    'Esta solicitud fue cerrada. Si necesitas ayuda, escríbenos.',
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

const STATUS_LABEL: Partial<Record<ReturnStatus, string>> = {
  PENDING:               'En revisión',
  EVIDENCE_REQUIRED:     'Pendiente de evidencia',
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

const TYPE_LABEL: Record<string, string> = {
  RETURN: 'Devolución', SIZE_EXCHANGE: 'Cambio de talla',
  PRODUCT_EXCHANGE: 'Cambio de producto', DEFECTIVE: 'Producto defectuoso',
  WARRANTY: 'Garantía', KYZZ_ERROR: 'Error de KYZZ',
};

interface Props { params: Promise<{ id: string }> }

export default async function MiDevolucionPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login?callbackUrl=/devoluciones');

  const { id } = await params;
  const ret = await getMyReturnById(id);
  if (!ret) notFound();

  const order = ret.order;
  return (
    <div className="max-w-3xl mx-auto px-6 py-14">

      {/* Cabecera */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Link href="/devoluciones" className="text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors">
            ← Mis devoluciones
          </Link>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
              {ret.rmaCode ?? 'Devolución'}
            </h1>
            <div className="w-6 h-px bg-kyzz-secondary mt-3" />
          </div>
          <span className={`text-[10px] tracking-widest uppercase px-3 py-1.5 border ${STATUS_COLOR[ret.status] ?? 'text-kyzz-muted border-kyzz-secondary'}`}>
            {STATUS_LABEL[ret.status] ?? ret.status}
          </span>
        </div>
        {ret.requestType && (
          <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mt-2">
            {TYPE_LABEL[ret.requestType] ?? ret.requestType}
          </p>
        )}
      </div>

      <div className="space-y-5">

        {/* Mensaje de estado */}
        <div className={`px-4 py-4 border text-sm leading-relaxed ${STATUS_COLOR[ret.status] ?? 'border-kyzz-secondary text-kyzz-muted'}`}>
          {STATUS_MESSAGE[ret.status] ?? 'Estamos gestionando tu solicitud.'}
          {ret.customerMessage && (
            <p className="mt-2 pt-2 border-t border-current/20 text-sm">
              {ret.customerMessage}
            </p>
          )}
        </div>

        {/* Acciones que el cliente puede tomar */}
        <CustomerReturnActions
          returnId={ret.id}
          rmaCode={ret.rmaCode}
          status={ret.status}
          returnTrackingCode={ret.returnTrackingCode}
          returnCarrier={ret.returnCarrier}
          proofImageUrl={ret.proofImageUrl}
          expiresAt={ret.expiresAt}
          whoPayShipping={ret.whoPayShipping}
          refundAmount={ret.refundAmount}
          refundMethod={ret.refundMethod}
          refundStatus={ret.refundStatus}
        />

        {/* Productos del pedido */}
        <div className="kyzz-panel p-5 space-y-3">
          <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted">Productos solicitados</p>
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
                  <div>
                    <p className="text-sm text-kyzz-dark">{item.product.title}</p>
                    <p className="text-[10px] text-kyzz-muted">Talla {item.size} · {item.quantity} und.</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tu solicitud */}
        <div className="kyzz-panel p-5 space-y-2">
          <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted">Tu solicitud</p>
          <p className="text-sm text-kyzz-dark">{ret.reason}</p>
          {ret.details && <p className="text-xs text-kyzz-muted leading-relaxed">{ret.details}</p>}
          {ret.expiresAt && (
            <p className="text-[10px] text-kyzz-muted mt-1">
              {ret.expiresAt > new Date()
                ? `Tienes hasta el ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(ret.expiresAt)} para enviar el producto.`
                : 'El plazo para enviar el producto ha vencido.'}
            </p>
          )}
        </div>

        {/* Timeline de eventos */}
        {ret.events.length > 0 && (
          <div className="kyzz-panel p-5 space-y-3">
            <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted">Historial</p>
            <ol className="relative space-y-4">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-kyzz-secondary" />
              {ret.events.map((ev, i) => {
                const isLast   = i === ret.events.length - 1;
                const isCustomer = ev.actor.startsWith('customer:');
                return (
                  <li key={ev.id} className="relative flex gap-4 pl-8">
                    <span className={`absolute left-0 w-6 h-6 flex items-center justify-center rounded-full border text-[10px] font-bold ${
                      isLast ? 'bg-kyzz-dark border-kyzz-dark text-white' : 'bg-white border-kyzz-secondary text-kyzz-muted'
                    }`}>
                      {isCustomer ? 'Tú' : 'K'}
                    </span>
                    <div className="flex-1 pb-1">
                      <p className="text-[11px] text-kyzz-dark font-medium">
                        {STATUS_LABEL[ev.toStatus as ReturnStatus] ?? ev.toStatus}
                        {' '}
                        <span className="font-normal text-kyzz-muted">
                          por {isCustomer ? 'ti' : 'KYZZ'}
                        </span>
                      </p>
                      <p className="text-[10px] text-kyzz-muted">
                        {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(ev.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <p className="text-xs text-kyzz-muted text-center">
          ¿Tienes dudas? Escríbenos por{' '}
          <a href={whatsappUrl(`Hola KYZZ, tengo una duda sobre mi solicitud ${ret.rmaCode ?? ret.id.split('-').at(-1)?.toUpperCase()}`)} target="_blank" rel="noopener noreferrer" className="underline hover:text-kyzz-primary">
            WhatsApp
          </a>
          {' '}citando el código {ret.rmaCode ?? ret.id.split('-').at(-1)?.toUpperCase()}.
        </p>
      </div>
    </div>
  );
}
