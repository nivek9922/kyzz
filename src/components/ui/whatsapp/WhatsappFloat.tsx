'use client';

import { usePathname } from 'next/navigation';
import { IoLogoWhatsapp } from 'react-icons/io5';
import { WHATSAPP_NUMBER, whatsappUrl } from '@/lib/whatsapp';

/** Botón flotante de WhatsApp en la tienda. Se oculta en admin y checkout. */
export const WhatsappFloat = () => {
  const pathname = usePathname();

  if (!WHATSAPP_NUMBER) return null;
  if (pathname.startsWith('/admin') || pathname.startsWith('/checkout')) return null;

  return (
    <a
      href={whatsappUrl('Hola KYZZ, quiero más información 🤍')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
    >
      <IoLogoWhatsapp size={26} />
    </a>
  );
};
