'use client';

import { useState } from 'react';
import { subscribeNewsletter } from '@/actions';
import { toast } from 'sonner';

export const NewsletterForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const toastId = toast.loading('Suscribiendo...');

    try {
      const result = await subscribeNewsletter(email);
      if (result.ok) {
        toast.success(result.message, { id: toastId });
        setEmail('');
      } else {
        toast.error(result.message, { id: toastId });
      }
    } catch {
      toast.error('Ocurrió un error. Intenta de nuevo.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex border-b border-kyzz-primary">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Tu correo electrónico"
        disabled={loading}
        className="flex-1 bg-transparent text-sm text-kyzz-dark placeholder-kyzz-muted py-2 outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={loading}
        className="text-xs tracking-widest uppercase text-kyzz-primary py-2 pl-4 hover:text-kyzz-dark transition-colors disabled:opacity-50"
      >
        Suscribir
      </button>
    </form>
  );
};
