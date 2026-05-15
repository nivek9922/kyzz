export type ColorFamily = 'neutral_light' | 'neutral_dark' | 'cool_neutral' | 'earth' | 'warm' | 'deep' | 'soft';

// Compatibility: each family lists the families it pairs well with
export const COLOR_COMPATIBILITY: Record<ColorFamily, ColorFamily[]> = {
  neutral_light: ['neutral_light', 'neutral_dark', 'cool_neutral', 'earth', 'warm', 'deep', 'soft'],
  neutral_dark:  ['neutral_light', 'neutral_dark', 'cool_neutral', 'earth', 'warm', 'deep', 'soft'],
  cool_neutral:  ['neutral_light', 'neutral_dark', 'cool_neutral', 'earth', 'warm', 'deep', 'soft'],
  earth:         ['neutral_light', 'neutral_dark', 'cool_neutral', 'earth', 'deep', 'warm'],
  warm:          ['neutral_light', 'neutral_dark', 'cool_neutral', 'earth'],
  deep:          ['neutral_light', 'neutral_dark', 'cool_neutral', 'earth'],
  soft:          ['neutral_light', 'neutral_dark', 'cool_neutral', 'soft'],
};

// Categories that complement each other in fashion styling
export const CATEGORY_COMPLEMENTS: Record<string, string[]> = {
  'jeans':     ['blusas', 'chaquetas'],
  'blusas':    ['jeans', 'chaquetas', 'enterizos'],
  'chaquetas': ['jeans', 'blusas', 'enterizos'],
  'enterizos': ['chaquetas'],
};

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hexToColorFamily(hex: string): ColorFamily {
  const { h, s, l } = hexToHsl(hex);
  if (l > 82)                               return 'neutral_light';
  if (l < 22)                               return 'neutral_dark';
  if (s < 12)                               return 'cool_neutral';
  if (h >= 15 && h < 55)                    return 'earth';
  if ((h >= 330 || h < 15) && l < 40)       return 'deep';
  if ((h >= 330 || h < 40) && l >= 40)      return 'warm';
  if (h >= 180 && h < 330)                  return 'soft';
  return 'earth';
}
