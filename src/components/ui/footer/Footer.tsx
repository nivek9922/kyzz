import { titleFont } from '@/config/fonts';
import Link from 'next/link';
import { IoLogoWhatsapp } from 'react-icons/io5';
import { NewsletterForm } from './NewsletterForm';
import { WHATSAPP_NUMBER, whatsappUrl } from '@/lib/whatsapp';

export const Footer = () => {
  return (
    <footer className="bg-kyzz-neutral border-t border-kyzz-secondary mt-24">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">

        {/* Marca */}
        <div>
          <span className={`${titleFont.className} text-lg tracking-[0.25em] uppercase text-kyzz-dark`}>
            KYZZ
          </span>
          <p className="mt-2 text-xs tracking-widest uppercase text-kyzz-muted">Accessible Luxury</p>
          <p className="mt-4 text-sm text-kyzz-muted leading-relaxed max-w-xs">
            Básicos que te acompañan todos los días. Un beso a tu estilo propio.
          </p>
          {WHATSAPP_NUMBER && (
            <a
              href={whatsappUrl('Hola KYZZ, quiero más información 🤍')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-xs tracking-widest uppercase text-kyzz-muted hover:text-[#1f9c50] transition-colors"
            >
              <IoLogoWhatsapp size={16} /> Escríbenos por WhatsApp
            </a>
          )}
        </div>

        {/* Links */}
        <div>
          <h3 className="text-xs tracking-widest uppercase text-kyzz-dark mb-4">Descubrir</h3>
          <ul className="space-y-2">
            {[
              { label: 'Privacidad', href: '/' },
              { label: 'Términos', href: '/' },
              { label: 'Envíos', href: '/' },
              { label: 'Sostenibilidad', href: '/' },
            ].map(({ label, href }) => (
              <li key={label}>
                <Link href={href} className="text-xs tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h3 className="text-xs tracking-widest uppercase text-kyzz-dark mb-4">Únete a la lista</h3>
          <p className="text-sm text-kyzz-muted mb-4">
            Recibe noticias sobre nuevas colecciones y acceso anticipado.
          </p>
          <NewsletterForm />
        </div>

      </div>

      {/* Bottom bar */}
      <div className="border-t border-kyzz-secondary">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-kyzz-muted tracking-wide">
            © {new Date().getFullYear()} KYZZ. Accessible Luxury.
          </p>
          <div className="flex gap-1">
            <span className="text-kyzz-muted text-xs">♡</span>
            <span className="text-xs text-kyzz-muted tracking-wider">Basics for every you</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
