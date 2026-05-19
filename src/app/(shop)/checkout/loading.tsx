import { titleFont } from '@/config/fonts';

export default function CheckoutLoading() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16 mb-24">

      <div className="mb-10">
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Checkout
        </h1>
        <div className="kyzz-divider-left" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16 items-start">

        {/* Formulario dirección */}
        <div className="space-y-5">
          {[1, 2].map((row) => (
            <div key={row} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((col) => (
                <div key={col} className="space-y-1.5">
                  <div className="h-2.5 w-24 bg-kyzz-secondary/40 animate-pulse" />
                  <div className="h-11 w-full bg-kyzz-secondary/30 animate-pulse" />
                </div>
              ))}
            </div>
          ))}
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2.5 w-28 bg-kyzz-secondary/40 animate-pulse" />
              <div className="h-11 w-full bg-kyzz-secondary/30 animate-pulse" />
            </div>
          ))}
          <div className="h-11 w-full bg-kyzz-secondary/50 animate-pulse mt-4" />
        </div>

        {/* Panel resumen */}
        <div className="kyzz-panel space-y-4">
          <div className="h-5 w-32 bg-kyzz-secondary/50 animate-pulse" />
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
          <div className="h-11 w-full bg-kyzz-secondary/50 animate-pulse mt-2" />
        </div>

      </div>
    </div>
  );
}
