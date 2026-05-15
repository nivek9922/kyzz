export default function ProductLoading() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 mb-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-start">

        {/* ── Slideshow ──────────────────────────────────────────── */}
        <div className="flex gap-3">
          {/* Miniaturas verticales */}
          <div className="hidden md:flex flex-col gap-2 w-16 shrink-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[3/4] bg-kyzz-secondary/40 animate-pulse" />
            ))}
          </div>
          {/* Imagen principal */}
          <div className="flex-1 aspect-[3/4] bg-kyzz-secondary/40 animate-pulse" />
        </div>

        {/* ── Info del producto ──────────────────────────────────── */}
        <div className="space-y-6 md:pt-4">

          {/* Categoría + título */}
          <div>
            <div className="h-2.5 w-20 bg-kyzz-secondary/40 animate-pulse mb-3" />
            <div className="h-7 w-4/5 bg-kyzz-secondary/50 animate-pulse mb-2" />
            <div className="h-5 w-24 bg-kyzz-secondary/40 animate-pulse mt-4" />
          </div>

          {/* Swatches de color */}
          <div className="flex gap-2 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-kyzz-secondary/40 animate-pulse" />
            ))}
          </div>

          {/* Selector de tallas */}
          <div className="space-y-2">
            <div className="h-2.5 w-16 bg-kyzz-secondary/40 animate-pulse" />
            <div className="flex gap-2 flex-wrap">
              {['XS', 'S', 'M', 'L', 'XL'].map((s) => (
                <div key={s} className="w-12 h-10 bg-kyzz-secondary/40 animate-pulse" />
              ))}
            </div>
          </div>

          {/* Cantidad + botón */}
          <div className="flex gap-3 pt-2">
            <div className="w-28 h-11 bg-kyzz-secondary/40 animate-pulse" />
            <div className="flex-1 h-11 bg-kyzz-secondary/50 animate-pulse" />
          </div>

          {/* Descripción */}
          <div className="space-y-2 pt-4 border-t border-kyzz-secondary">
            {[100, 90, 75, 85].map((w, i) => (
              <div key={i} className="h-2.5 bg-kyzz-secondary/40 animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>

          {/* Tabs */}
          <div className="space-y-px pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-kyzz-secondary/30 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
