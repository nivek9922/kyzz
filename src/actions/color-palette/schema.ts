import { z } from 'zod';

export const paletteColorBaseSchema = z.object({
  name:      z.string().min(1).max(60),
  hex:       z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Formato hex inválido (ej: #FF0000)'),
  sortOrder: z.number().int().default(0),
});

export const createPaletteColorSchema = paletteColorBaseSchema;

export const updatePaletteColorSchema = paletteColorBaseSchema.extend({
  id: z.string().uuid(),
});
