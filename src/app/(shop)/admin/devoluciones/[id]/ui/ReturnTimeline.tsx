import {
  IoDocumentOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoStorefrontOutline, IoSearchOutline, IoCheckmarkDoneOutline,
  IoMailOutline, IoTimeOutline, IoAlertCircleOutline,
} from 'react-icons/io5';

interface ReturnEventRow {
  id:         string;
  actor:      string;
  actorName:  string;
  fromStatus: string | null;
  toStatus:   string;
  notes:      string | null;
  createdAt:  Date;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING:               <IoDocumentOutline size={14} className="text-kyzz-muted" />,
  EVIDENCE_REQUIRED:     <IoAlertCircleOutline size={14} className="text-amber-500" />,
  APPROVED:              <IoCheckmarkCircleOutline size={14} className="text-blue-500" />,
  GUIDE_SENT:            <IoMailOutline size={14} className="text-blue-500" />,
  IN_TRANSIT:            <IoTimeOutline size={14} className="text-sky-500" />,
  RECEIVED:              <IoStorefrontOutline size={14} className="text-sky-500" />,
  INSPECTING:            <IoSearchOutline size={14} className="text-violet-500" />,
  ACCEPTED:              <IoCheckmarkCircleOutline size={14} className="text-emerald-500" />,
  PROCESSING:            <IoCheckmarkCircleOutline size={14} className="text-emerald-500" />,
  COMPLETED:             <IoCheckmarkDoneOutline size={14} className="text-kyzz-primary" />,
  REJECTED:              <IoCloseCircleOutline size={14} className="text-red-400" />,
  REJECTED_AFTER_INSPECT:<IoCloseCircleOutline size={14} className="text-red-400" />,
  CLOSED:                <IoCheckmarkCircleOutline size={14} className="text-kyzz-muted" />,
};

const STATUS_LABEL: Record<string, string> = {
  PENDING:               'Solicitud creada',
  EVIDENCE_REQUIRED:     'Se solicitó evidencia',
  APPROVED:              'Solicitud aprobada',
  GUIDE_SENT:            'Guía de regreso enviada',
  IN_TRANSIT:            'Marcada en tránsito',
  RECEIVED:              'Recibida en bodega',
  INSPECTING:            'Inspección iniciada',
  ACCEPTED:              'Inspección aprobada',
  PROCESSING:            'Resolución en proceso',
  COMPLETED:             'Solicitud completada',
  REJECTED:              'Solicitud rechazada',
  REJECTED_AFTER_INSPECT:'Rechazada tras inspección',
  CLOSED:                'Solicitud cerrada',
};

interface Props {
  events: ReturnEventRow[];
}

export function ReturnTimeline({ events }: Props) {
  return (
    <div className="kyzz-panel p-5 space-y-3">
      <p className="text-[10px] tracking-[0.25em] uppercase text-kyzz-muted">Historial de acciones</p>
      <div className="relative">
        {/* Línea vertical */}
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-kyzz-secondary" />

        <ol className="space-y-4">
          {events.map((ev, i) => {
            const isLast  = i === events.length - 1;
            const icon    = STATUS_ICON[ev.toStatus] ?? <IoDocumentOutline size={14} className="text-kyzz-muted" />;
            const label   = STATUS_LABEL[ev.toStatus] ?? ev.toStatus;
            const actorType = ev.actor.startsWith('admin:') ? 'Admin' : ev.actor.startsWith('customer:') ? 'Clienta' : 'Sistema';

            return (
              <li key={ev.id} className="relative flex gap-4 pl-8">
                {/* Icono sobre la línea */}
                <span className={`absolute left-0 flex items-center justify-center w-7 h-7 rounded-full border ${
                  isLast ? 'bg-kyzz-dark border-kyzz-dark text-white' : 'bg-white border-kyzz-secondary'
                }`}>
                  {icon}
                </span>

                {/* Contenido */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-kyzz-dark">{label}</p>
                    <span className="text-[9px] tracking-widest uppercase text-kyzz-muted px-1.5 py-0.5 border border-kyzz-secondary">
                      {actorType} · {ev.actorName}
                    </span>
                  </div>
                  <p className="text-[10px] text-kyzz-muted mt-0.5">
                    {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(ev.createdAt)}
                    {ev.fromStatus && (
                      <span className="ml-2 opacity-60">{ev.fromStatus} → {ev.toStatus}</span>
                    )}
                  </p>
                  {ev.notes && (
                    <p className="text-[11px] text-kyzz-muted mt-1 italic leading-relaxed border-l-2 border-kyzz-secondary pl-2">
                      {ev.notes}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
