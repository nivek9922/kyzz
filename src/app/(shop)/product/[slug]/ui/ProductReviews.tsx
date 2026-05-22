'use client';

import { useState, useTransition, useRef } from 'react';
import { IoStar, IoStarOutline } from 'react-icons/io5';
import { toast } from 'sonner';
import { titleFont } from '@/config/fonts';
import type { ProductReview, ReviewSummary } from '@/actions/review/get-product-reviews';
import { createOrUpdateReview, deleteReview } from '@/actions/review/create-review';

interface Props {
  productId:   string;
  reviews:     ProductReview[];
  summary:     ReviewSummary;
  userReview:  { id: string; rating: number; comment: string | null } | null;
  hasPurchased: boolean;
  isLoggedIn:  boolean;
}

function StarRow({ value, onChange, readOnly = false }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className="text-kyzz-primary disabled:cursor-default"
          aria-label={`${n} estrellas`}
        >
          {n <= active
            ? <IoStar size={readOnly ? 13 : 18} />
            : <IoStarOutline size={readOnly ? 13 : 18} />}
        </button>
      ))}
    </div>
  );
}

function DistributionBar({ count, total, label }: { count: number; total: number; label: number }) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-3 text-right text-kyzz-muted">{label}</span>
      <div className="flex-1 h-1.5 bg-kyzz-secondary rounded-full overflow-hidden">
        <div className="h-full bg-kyzz-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-5 text-kyzz-muted">{count}</span>
    </div>
  );
}

export const ProductReviews = ({ productId, reviews: init, summary: initSummary, userReview: initUserReview, hasPurchased, isLoggedIn }: Props) => {
  const [reviews, setReviews]         = useState(init);
  const [summary, setSummary]         = useState(initSummary);
  const [userReview, setUserReview]   = useState(initUserReview);
  const [showForm, setShowForm]       = useState(false);
  const [rating, setRating]           = useState(initUserReview?.rating ?? 0);
  const [comment, setComment]         = useState(initUserReview?.comment ?? '');
  const [isPending, startTransition]  = useTransition();
  const formRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    if (rating === 0) { toast.error('Elige una calificación'); return; }
    startTransition(async () => {
      const res = await createOrUpdateReview({ productId, rating, comment: comment.trim() || undefined });
      if (!res.ok) { toast.error(res.message ?? 'Error al guardar'); return; }
      toast.success(userReview ? 'Reseña actualizada' : 'Reseña publicada');
      // Refresh inline
      const [{ getProductReviews }] = await Promise.all([import('@/actions/review/get-product-reviews')]);
      const fresh = await getProductReviews(productId);
      setReviews(fresh.reviews);
      setSummary(fresh.summary);
      setUserReview(fresh.userReview);
      setShowForm(false);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteReview(id);
      if (!res.ok) { toast.error('No se pudo eliminar'); return; }
      toast.success('Reseña eliminada');
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setSummary((prev) => {
        const count = prev.count - 1;
        const avg   = count === 0 ? 0 : (prev.average * prev.count - (userReview?.rating ?? 0)) / count;
        return { ...prev, count, average: avg };
      });
      setUserReview(null);
      setRating(0);
      setComment('');
    });
  };

  return (
    <section className="mt-16 pt-10 border-t border-kyzz-secondary">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-8">
        <h2 className={`${titleFont.className} text-2xl font-normal text-kyzz-dark`}>
          Reseñas
        </h2>
        {hasPurchased && !showForm && (
          <button
            onClick={() => { setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50); }}
            className="text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-dark transition-colors"
          >
            {userReview ? 'Editar reseña' : 'Escribir reseña'}
          </button>
        )}
      </div>

      {/* Resumen + distribución */}
      {summary.count > 0 && (
        <div className="flex gap-8 mb-10">
          <div className="text-center shrink-0">
            <p className={`${titleFont.className} text-5xl font-normal text-kyzz-dark leading-none`}>
              {summary.average.toFixed(1)}
            </p>
            <StarRow value={Math.round(summary.average)} readOnly />
            <p className="text-xs text-kyzz-muted mt-1">{summary.count} {summary.count === 1 ? 'reseña' : 'reseñas'}</p>
          </div>
          <div className="flex-1 space-y-1.5 pt-1">
            {([5, 4, 3, 2, 1] as const).map((n) => (
              <DistributionBar key={n} label={n} count={summary.distribution[n]} total={summary.count} />
            ))}
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div ref={formRef} className="border border-kyzz-secondary p-6 mb-8 space-y-4">
          <p className="text-[11px] tracking-widest uppercase text-kyzz-muted">
            {userReview ? 'Actualizar reseña' : 'Tu reseña'}
          </p>
          <StarRow value={rating} onChange={setRating} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={600}
            rows={4}
            placeholder="Comparte tu experiencia con esta pieza (opcional)"
            className="w-full kyzz-input resize-none text-sm leading-relaxed"
          />
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={isPending || rating === 0}
              className="btn-primary"
            >
              {isPending ? 'Guardando...' : 'Publicar'}
            </button>
            <button
              onClick={() => { setShowForm(false); setRating(initUserReview?.rating ?? 0); setComment(initUserReview?.comment ?? ''); }}
              className="text-[11px] tracking-widest uppercase text-kyzz-muted hover:text-kyzz-dark transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Invitación a comprar/iniciar sesión */}
      {!isLoggedIn && summary.count === 0 && (
        <p className="text-sm text-kyzz-muted">
          Sé la primera en reseñar este producto tras comprarlo.
        </p>
      )}
      {isLoggedIn && !hasPurchased && !userReview && summary.count === 0 && (
        <p className="text-sm text-kyzz-muted">
          Aún no hay reseñas. Cómpralo y cuéntanos qué te pareció.
        </p>
      )}

      {/* Lista */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <article key={review.id} className="border-b border-kyzz-secondary pb-6 last:border-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <StarRow value={review.rating} readOnly />
                <p className="text-sm font-medium text-kyzz-dark mt-1">{review.userName}</p>
                <p className="text-xs text-kyzz-muted mt-0.5">
                  {new Intl.DateTimeFormat('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(review.createdAt))}
                </p>
              </div>
              {userReview?.id === review.id && (
                <button
                  onClick={() => handleDelete(review.id)}
                  disabled={isPending}
                  className="text-[10px] tracking-widest uppercase text-kyzz-muted hover:text-red-500 transition-colors shrink-0"
                >
                  Eliminar
                </button>
              )}
            </div>
            {review.comment && (
              <p className="text-sm text-kyzz-muted leading-relaxed mt-3">{review.comment}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};
