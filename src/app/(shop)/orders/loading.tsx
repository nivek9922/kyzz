import { titleFont } from '@/config/fonts';

export default function OrdersLoading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 mb-24">

      <div className="mb-10">
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Mis pedidos
        </h1>
        <div className="kyzz-divider-left" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kyzz-panel flex items-center gap-5 animate-pulse">
            <div className="w-20 h-24 bg-kyzz-secondary/40 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 bg-kyzz-secondary/40" />
              <div className="h-3 w-1/3 bg-kyzz-secondary/30" />
              <div className="h-3 w-1/4 bg-kyzz-secondary/20" />
            </div>
            <div className="h-3 w-20 bg-kyzz-secondary/40 shrink-0" />
          </div>
        ))}
      </div>

    </div>
  );
}
