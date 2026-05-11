import { titleFont } from '@/config/fonts';
import { getSiteConfig } from '@/actions';
import { SiteConfigForm } from './ui/SiteConfigForm';

export default async function AdminConfiguracionPage() {
  const config = await getSiteConfig();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-2">Admin</p>
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Configuración
        </h1>
        <div className="w-6 h-px bg-kyzz-secondary mt-3" />
      </div>

      <div className="kyzz-panel p-8">
        <p className="text-[10px] tracking-[0.3em] uppercase text-kyzz-muted mb-8">
          Página principal · Banner hero
        </p>
        <SiteConfigForm config={config} />
      </div>
    </div>
  );
}
