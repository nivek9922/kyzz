import { titleFont } from '@/config/fonts';

export default function ColeccionEspecialLoading() {
  return (
    <>
      <section className="border-b border-kyzz-secondary bg-kyzz-tertiary">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <div className="h-2.5 w-32 bg-kyzz-secondary/50 animate-pulse mx-auto mb-4" />
          <div className={`${titleFont.className} h-10 w-64 bg-kyzz-secondary/50 animate-pulse mx-auto mb-4`} />
          <div className="h-3 w-80 bg-kyzz-secondary/40 animate-pulse mx-auto" />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[3/4] bg-kyzz-secondary/40 animate-pulse" />
              <div className="pt-3 space-y-1.5">
                <div className="h-3 w-3/4 bg-kyzz-secondary/40 animate-pulse" />
                <div className="h-3 w-1/3 bg-kyzz-secondary/40 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
