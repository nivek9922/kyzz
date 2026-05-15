import { titleFont } from '@/config/fonts';

export default function ProductsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6">

      {/* ── Cabecera ────────────────────────────────────────────── */}
      <div className="border-b border-kyzz-secondary py-10 mb-10">
        <div className="h-3 w-24 bg-kyzz-secondary/50 animate-pulse mb-4" />
        <div className={`${titleFont.className} h-9 w-48 bg-kyzz-secondary/50 animate-pulse`} />
      </div>

      <div className="flex gap-10 items-start">

        {/* ── Filtros (sidebar izquierdo) ─── desktop only ─────── */}
        <aside className="hidden lg:block w-52 shrink-0 space-y-6">
          {[80, 100, 60, 90].map((w, i) => (
            <div key={i} className="space-y-2">
              <div className="h-2.5 bg-kyzz-secondary/50 animate-pulse" style={{ width: `${w}%` }} />
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-2 w-full bg-kyzz-secondary/40 animate-pulse" />
              ))}
            </div>
          ))}
        </aside>

        {/* ── Grid de productos ─────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Selector de columnas */}
          <div className="flex justify-end mb-6 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-8 h-8 bg-kyzz-secondary/40 animate-pulse" />
            ))}
          </div>

          {/* Grid 3 columnas */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[3/4] bg-kyzz-secondary/40 animate-pulse" />
                <div className="pt-3 space-y-1.5">
                  <div className="h-3 w-3/4 bg-kyzz-secondary/40 animate-pulse" />
                  <div className="h-3 w-1/3 bg-kyzz-secondary/40 animate-pulse" />
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          <div className="flex justify-center gap-2 mt-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-8 h-8 bg-kyzz-secondary/40 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
