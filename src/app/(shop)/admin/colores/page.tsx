import { titleFont } from '@/config/fonts';
import { getColorPalette } from '@/actions';
import { ColorPaletteManager } from './ui/ColorPaletteManager';

export default async function ColoresAdminPage() {
  const colors = await getColorPalette();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-[11px] tracking-[0.25em] uppercase text-kyzz-muted mb-2">Admin</p>
        <h1 className={`${titleFont.className} text-3xl font-normal text-kyzz-dark`}>
          Paleta de colores
        </h1>
        <p className="mt-2 text-sm text-kyzz-muted">
          Gestiona los colores disponibles para asignar a productos. Solo se muestran en los filtros los colores con al menos un producto asignado.
        </p>
      </div>

      <ColorPaletteManager initialColors={colors} />
    </div>
  );
}
