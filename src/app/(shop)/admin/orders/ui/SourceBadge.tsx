import {
  IoLogoWhatsapp, IoLogoInstagram,
  IoGlobeOutline, IoStorefrontOutline,
} from 'react-icons/io5';

interface Props {
  channel:       string;
  paymentMethod: string;
}

/** Badge compacto que muestra el origen del pedido (canal + método). */
export function SourceBadge({ channel, paymentMethod }: Props) {
  const isCod = paymentMethod === 'cod';

  if (channel === 'whatsapp') return (
    <span className="inline-flex items-center gap-1 text-[9px] tracking-widest uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5">
      <IoLogoWhatsapp size={9} /> WhatsApp{isCod ? ' · COD' : ''}
    </span>
  );

  if (channel === 'instagram') return (
    <span className="inline-flex items-center gap-1 text-[9px] tracking-widest uppercase text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5">
      <IoLogoInstagram size={9} /> Instagram{isCod ? ' · COD' : ''}
    </span>
  );

  if (channel === 'other') return (
    <span className="inline-flex items-center gap-1 text-[9px] tracking-widest uppercase text-kyzz-muted bg-kyzz-tertiary border border-kyzz-secondary px-1.5 py-0.5">
      <IoStorefrontOutline size={9} /> Manual{isCod ? ' · COD' : ''}
    </span>
  );

  // Web + COD merece badge; Web + prepago es el flujo default y no necesita etiqueta
  if (isCod) return (
    <span className="inline-flex items-center gap-1 text-[9px] tracking-widest uppercase text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
      <IoGlobeOutline size={9} /> Web · COD
    </span>
  );

  return null;
}
