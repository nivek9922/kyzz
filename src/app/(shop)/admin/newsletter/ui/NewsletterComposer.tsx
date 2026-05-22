'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { IoCheckmarkCircleOutline, IoImageOutline, IoCloseOutline, IoCloudOutline } from 'react-icons/io5';
import { sendNewsletter, type NewsletterProduct } from '@/actions';

interface ProductOption {
  id:       string;
  title:    string;
  price:    number;
  slug:     string;
  imageUrl: string;
}

interface Props {
  products:         ProductOption[];
  subscriberCount:  number;
}

export const NewsletterComposer = ({ products, subscriberCount }: Props) => {
  const [subject,   setSubject]   = useState('');
  const [headline,  setHeadline]  = useState('');
  const [message,   setMessage]   = useState('');
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [sending,   setSending]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [confirm,   setConfirm]   = useState(false);

  const toggleProduct = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const canSend = subject.trim() && headline.trim() && message.trim() && subscriberCount > 0;

  const handleSend = async () => {
    if (!canSend) return;
    setConfirm(true);
  };

  const handleConfirmedSend = async () => {
    setConfirm(false);
    setSending(true);
    const id = toast.loading('Enviando newsletter...');

    const chosenProducts: NewsletterProduct[] = products
      .filter(p => selected.has(p.id))
      .map(p => ({ title: p.title, price: p.price, slug: p.slug, imageUrl: p.imageUrl }));

    const result = await sendNewsletter({ subject, headline, message, products: chosenProducts });


    if (result.ok) {
      toast.success(result.message, { id });
      setSent(true);
    } else {
      toast.error(result.message, { id });
      setSending(false);
    }
  };

  const resetForm = () => {
    setSent(false); setSending(false);
    setSubject(''); setHeadline(''); setMessage(''); setSelected(new Set());
  };

  if (sent) {
    return (
      <div className="kyzz-panel p-12 text-center space-y-4">
        <IoCheckmarkCircleOutline className="mx-auto text-emerald-500" size={40} />
        <p className={`text-xl font-normal text-kyzz-dark`}>Newsletter enviado</p>
        <p className="text-sm text-kyzz-muted">Tu campaña llegó a los suscriptores activos.</p>
        <button onClick={resetForm} className="text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-primary transition-colors">
          Crear nuevo newsletter
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="kyzz-panel p-5 text-center">
          <p className="text-2xl font-light text-kyzz-dark">{subscriberCount}</p>
          <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mt-1">Suscriptores activos</p>
        </div>
        <div className="kyzz-panel p-5 text-center">
          <p className="text-2xl font-light text-kyzz-dark">{selected.size}</p>
          <p className="text-[10px] tracking-widest uppercase text-kyzz-muted mt-1">Productos seleccionados</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="kyzz-panel p-6 space-y-5">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted">Contenido del email</p>

        <div>
          <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-2">
            Asunto <span className="text-red-400">*</span>
          </label>
          <input
            className="kyzz-input text-sm"
            placeholder="Ej: Nueva colección de verano · KYZZ"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
          <p className="text-[10px] text-kyzz-muted mt-1">Lo que el cliente ve en su bandeja de entrada.</p>
        </div>

        <div>
          <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-2">
            Título del email <span className="text-red-400">*</span>
          </label>
          <input
            className="kyzz-input text-sm"
            placeholder="Ej: Básicos de verano — ya están aquí"
            value={headline}
            onChange={e => setHeadline(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[11px] tracking-widest uppercase text-kyzz-muted mb-2">
            Mensaje <span className="text-red-400">*</span>
          </label>
          <textarea
            className="kyzz-input text-sm resize-none"
            rows={4}
            placeholder="Cuéntales sobre la nueva colección, qué la hace especial, por qué deben verla..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>
      </div>

      {/* Selección de productos */}
      {products.length > 0 && (
        <div className="kyzz-panel p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted">
              Productos a mostrar
            </p>
            <p className="text-[10px] text-kyzz-muted">Máx. 3</p>
          </div>
          <div className="flex items-center gap-3 mb-4 text-[10px] text-kyzz-muted">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Imagen en Cloudinary — se verá en el email</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Imagen local — aparece como placeholder</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map(p => {
              const isSelected  = selected.has(p.id);
              const isDisabled  = !isSelected && selected.size >= 3;
              const isPublicImg = p.imageUrl.startsWith('https://');
              return (
                <button
                  key={p.id}
                  onClick={() => !isDisabled && toggleProduct(p.id)}
                  className={`relative text-left border transition-all ${
                    isSelected
                      ? 'border-kyzz-primary'
                      : isDisabled
                        ? 'border-kyzz-secondary opacity-40 cursor-not-allowed'
                        : 'border-kyzz-secondary hover:border-kyzz-primary'
                  }`}
                >
                  <div className="aspect-[3/4] bg-kyzz-tertiary overflow-hidden relative">
                    {p.imageUrl ? (
                      <Image
                        src={p.imageUrl.startsWith('http') ? p.imageUrl : `/products/${p.imageUrl}`}
                        alt={p.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <IoImageOutline className="text-kyzz-muted" size={24} />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-kyzz-dark/30 flex items-center justify-center">
                        <IoCheckmarkCircleOutline className="text-white" size={24} />
                      </div>
                    )}
                    {/* Indicador: imagen en la nube (visible en email) o local (placeholder) */}
                    <div className={`absolute top-1.5 right-1.5 rounded-full p-0.5 ${isPublicImg ? 'bg-emerald-500' : 'bg-amber-400'}`}
                      title={isPublicImg ? 'Imagen en Cloudinary — visible en email' : 'Imagen local — se verá como placeholder en email'}>
                      <IoCloudOutline size={10} className="text-white" />
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] text-kyzz-dark truncate">{p.title}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Enviar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-kyzz-muted">
          {subscriberCount === 0
            ? 'Sin suscriptores activos aún.'
            : `Se enviará a ${subscriberCount} persona${subscriberCount !== 1 ? 's' : ''}.`}
        </p>
        <button
          onClick={handleSend}
          disabled={!canSend || sending}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? 'Enviando...' : 'Enviar newsletter'}
        </button>
      </div>

      {/* Modal de confirmación KYZZ */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-kyzz-dark/40 backdrop-blur-sm">
          <div className="bg-kyzz-neutral border border-kyzz-secondary w-full max-w-sm mx-4 p-8">
            <div className="flex items-start justify-between mb-6">
              <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted">Confirmar envío</p>
              <button onClick={() => setConfirm(false)} className="text-kyzz-muted hover:text-kyzz-dark transition-colors">
                <IoCloseOutline size={18} />
              </button>
            </div>
            <p className="text-kyzz-dark text-sm mb-2">
              Estás a punto de enviar el newsletter a{' '}
              <strong>{subscriberCount} suscriptor{subscriberCount !== 1 ? 'es' : ''}</strong>.
            </p>
            <p className="text-xs text-kyzz-muted mb-8 leading-relaxed">
              Asunto: <span className="italic">{subject}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                className="flex-1 border border-kyzz-secondary text-[11px] tracking-widest uppercase text-kyzz-muted py-3 hover:border-kyzz-primary hover:text-kyzz-primary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmedSend}
                className="flex-1 btn-primary text-[11px]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
