import { titleFont } from '@/config/fonts';

export default function CartLoading() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16 mb-24">

      {/* Cabecera */}
      <div className="mb-12">
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Tu carrito
        </h1>
        <div className="kyzz-divider-left" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-16 items-start">

        {/* ── Lista de productos ──────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="h-2.5 w-20 bg-kyzz-secondary/40 animate-pulse" />
            <div className="h-2.5 w-32 bg-kyzz-secondary/40 animate-pulse" />
          </div>

          <div className="divide-y divide-kyzz-secondary">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-5 py-6">
                <div className="w-24 h-32 sm:w-32 sm:h-44 bg-kyzz-secondary/40 animate-pulse shrink-0" />
                <div className="flex flex-col justify-between flex-1 py-1">
                  <div className="space-y-2">
                    <div className="h-3 w-3/4 bg-kyzz-secondary/40 animate-pulse" />
                    <div className="h-3 w-1/3 bg-kyzz-secondary/40 animate-pulse" />
                    <div className="h-3 w-1/4 bg-kyzz-secondary/40 animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-28 bg-kyzz-secondary/40 animate-pulse" />
                    <div className="h-3 w-16 bg-kyzz-secondary/40 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Panel resumen ───────────────────────────────────── */}
        <div className="kyzz-panel">
          <div className="h-5 w-24 bg-kyzz-secondary/50 animate-pulse mb-6" />
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-28 bg-kyzz-secondary/40 animate-pulse" />
                <div className="h-3 w-20 bg-kyzz-secondary/40 animate-pulse" />
              </div>
            ))}
            <div className="border-t border-kyzz-secondary pt-4 flex justify-between">
              <div className="h-3.5 w-12 bg-kyzz-secondary/50 animate-pulse" />
              <div className="h-3.5 w-24 bg-kyzz-secondary/50 animate-pulse" />
            </div>
            <div className="h-2.5 w-40 bg-kyzz-secondary/30 animate-pulse" />
          </div>
          <div className="mt-8 h-11 w-full bg-kyzz-secondary/50 animate-pulse" />
        </div>

      </div>
    </div>
  );
}
